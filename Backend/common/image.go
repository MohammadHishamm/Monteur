package common

import (
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"math"
	"os"
	"regexp"
	"slices"
	"strings"

	"golang.org/x/image/draw"
)

var (
	ValidImageExts = ValidFileExts{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
		".gif":  true,
		".webp": true,
	}
	ValidResizeImageExts = ValidFileExts{
		".jpg":  true,
		".jpeg": true,
		".png":  true,
	}
	hexColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)
)

type ColorData struct {
	Color     color.RGBA
	Hex       string
	Count     int
	Lightness float64
}

type ImageColorMap map[color.RGBA]int
type ImageColorLightnessMap map[string]float64
type ImageHexMap map[string]int

func ResizeImage(file *os.File, maxWidth int) (*image.RGBA, string, error) {
	img, format, err := image.Decode(file)
	if err != nil {
		return nil, "", err
	}

	err = ValidateImageExt(format)
	if err != nil {
		return nil, "", err
	}

	bounds := img.Bounds()
	originalWidth := bounds.Dx()
	originalHeight := bounds.Dy()

	aspectRatio := float64(originalWidth) / float64(originalHeight)
	width, height := maxWidth, int(float64(maxWidth)/aspectRatio)

	tempImg := image.NewRGBA(image.Rect(0, 0, width, height))
	draw.CatmullRom.Scale(tempImg, tempImg.Bounds(), img, bounds, draw.Over, nil)

	return tempImg, format, nil
}

func ValidateImageExt(extn string) error {
	contains := strings.Contains(extn, ".")
	if !contains {
		extn = "." + extn
	}

	if !ValidResizeImageExts[extn] {
		return ErrFileInvalidType
	}

	return nil
}

func EncodeJPG(dst *os.File, img *image.RGBA) error {
	err := jpeg.Encode(dst, img, &jpeg.Options{Quality: ImageJPGQuality})
	if err != nil {
		return err
	}

	return nil
}

func EncodePNG(dst *os.File, img *image.RGBA) error {
	err := png.Encode(dst, img)
	if err != nil {
		return err
	}

	return nil
}

func ResizeImageToFixedSize(file io.Reader, width, height int) (image.Image, string, error) {
    src, format, err := image.Decode(file)
    if err != nil {
        return nil, "", err
    }

    // Create a new RGBA image with the target size
    dst := image.NewRGBA(image.Rect(0, 0, width, height))

    // Use high-quality resampling
    draw.CatmullRom.Scale(dst, dst.Bounds(), src, src.Bounds(), draw.Over, nil)

    return dst, format, nil
}


// GetDominantColor returns the dominant color of an image.
// TODO: this function is not stable and may not always return
// same color each run
func GetDominantColor(f *os.File) (cDark, cLight string, err error) {
	_, format, err := image.DecodeConfig(f)
	if err != nil {
		return "", "", fmt.Errorf("failed to decode image format: %w", err)
	}

	if _, err := f.Seek(0, 0); err != nil {
		return "", "", fmt.Errorf("failed to reset file pointer: %w", err)
	}

	var img image.Image
	switch format {
	case "jpeg", "jpg":
		img, err = jpeg.Decode(f)
	case "png":
		img, err = png.Decode(f)
	default:
		return "", "", fmt.Errorf("unsupported image format: %s", format)
	}

	if err != nil {
		return "", "", fmt.Errorf("failed to decode image: %w", err)
	}

	if img == nil {
		return "", "", fmt.Errorf("decoded image is nil")
	}

	imgRGB := ConvertToRGBA(img)
	if imgRGB == nil {
		return "", "", fmt.Errorf("failed to convert image to RGBA")
	}

	colors := getColorsCount(imgRGB)
	if len(colors) == 0 {
		return "", "", fmt.Errorf("no colors found in image")
	}

	clusters := getColorsClusters(colors)
	if len(clusters) == 0 {
		return "", "", fmt.Errorf("no color clusters found")
	}

	if len(clusters) == 0 {
		return "", "", fmt.Errorf("no dominant colors found")
	}
	lightnesses := getColorsLightness(clusters)
	cDark, cLight = getDarkLightColor(lightnesses)

	if cDark == "" || cLight == "" {
		return "", "", fmt.Errorf("failed to determine dark and light colors")
	}

	return
}

// getColorsCount returns a map of color counts for an image.
func getColorsCount(img *image.RGBA) []*ColorData {
	var (
		colors []*ColorData
		bounds = img.Bounds()
		step   = 50
	)

	for y := bounds.Min.Y; y < bounds.Max.Y; y += step {
		for x := bounds.Min.X; x < bounds.Max.X; x += step {
			offset := (y-img.Bounds().Min.Y)*img.Stride + (x-img.Bounds().Min.X)*4
			r := img.Pix[offset]
			g := img.Pix[offset+1]
			b := img.Pix[offset+2]
			a := img.Pix[offset+3]

			colors = append(colors, &ColorData{
				Color: color.RGBA{R: r, G: g, B: b, A: a},
				Count: 1,
			})
		}
	}

	return colors
}

// getColorsClusters returns a map of color clusters.
func getColorsClusters(colors []*ColorData) []*ColorData {
	var (
		clusters  []*ColorData
		processed = make(map[color.RGBA]bool)
	)

	for _, c1 := range colors {
		if processed[c1.Color] {
			continue
		}

		currentCluster := c1.Color
		currentCount := c1.Count

		for _, c2 := range colors {
			if c1 == c2 || processed[c2.Color] {
				continue
			}

			if GetColorDistance(currentCluster, c2.Color) < ImageColorCluster {
				currentCluster = GetAvgColor(currentCluster, c2.Color)
				currentCount += c2.Count
				processed[c2.Color] = true
			}
		}

		clusters = append(clusters, &ColorData{
			Color: currentCluster,
			Count: currentCount,
		})
		processed[currentCluster] = true
	}

	return clusters
}

// getDarkLightColor returns the darkest and lightest colors in the map in hex format.
// NOTE: the color selection needs to be optimized more,
// could return the first color in the sorted list that either dark or light
func getDarkLightColor(colors []*ColorData) (darkColor, lightColor string) {
	var darkCandidates, lightCandidates []*ColorData

	for _, c := range colors {
		if c.Lightness > 0.3 && c.Lightness < 0.5 {
			darkCandidates = append(darkCandidates, c)
		}
		if c.Lightness > 0.5 && c.Lightness < 0.7 {
			lightCandidates = append(lightCandidates, c)
		}
	}

	if len(darkCandidates) > 0 {
		darkColor = darkCandidates[len(darkCandidates)/2].Hex
	}

	if len(lightCandidates) > 0 {
		lightColor = lightCandidates[len(lightCandidates)/2].Hex
	}

	return darkColor, lightColor
}

func getColorsLightness(colors []*ColorData) []*ColorData {
	for _, c := range colors {
		c.Lightness = getColorLightness(c.Color)
		c.Hex = ColorToHex(c.Color)
	}

	slices.SortFunc(colors, func(a, b *ColorData) int {
		if a.Lightness > b.Lightness {
			return 1
		}

		if a.Lightness < b.Lightness {
			return -1
		}

		return 0
	})

	return colors
}

// GetColorDistance returns the distance between two colors.
func GetColorDistance(c1, c2 color.RGBA) int {
	rDiff := int(c1.R) - int(c2.R)
	gDiff := int(c1.G) - int(c2.G)
	bDiff := int(c1.B) - int(c2.B)

	return rDiff*rDiff + gDiff*gDiff + bDiff*bDiff
}

// GetAvgColor returns the average color of two colors.
func GetAvgColor(c1, c2 color.RGBA) color.RGBA {
	r := (int(c1.R) + int(c2.R)) / 2
	g := (int(c1.G) + int(c2.G)) / 2
	b := (int(c1.B) + int(c2.B)) / 2

	return color.RGBA{
		R: uint8(r),
		G: uint8(g),
		B: uint8(b),
		A: 255,
	}
}

// ConvertToRGBA converts an image.Image to an *image.RGBA.
func ConvertToRGBA(src image.Image) *image.RGBA {
	bounds := src.Bounds()
	rgba := image.NewRGBA(bounds)
	draw.Draw(rgba, bounds, src, bounds.Min, draw.Src)
	return rgba
}

// ColorToHex converts a color.RGBA to a hex string.
func ColorToHex(c color.RGBA) string {
	return fmt.Sprintf("#%02X%02X%02X", c.R, c.G, c.B)
}

// IsValidHexColor checks if a string is a valid hex color.
func IsValidHexColor(color string) bool {
	if color == "" {
		return false
	}

	return hexColorRegex.MatchString(color)
}

// getColorLightness calculates the lightness of a color.
func getColorLightness(c color.RGBA) float64 {
	r := float64(c.R) / 255
	g := float64(c.G) / 255
	b := float64(c.B) / 255

	max := math.Max(r, g)
	max = math.Max(max, b)

	min := math.Min(r, g)
	min = math.Min(min, b)

	return (min + max) / 2
}

func isResizableImageFormat(ext string) bool {
	if !strings.Contains(ext, ".") {
		ext = "." + ext
	}

	return ValidResizeImageExts[ext]
}
