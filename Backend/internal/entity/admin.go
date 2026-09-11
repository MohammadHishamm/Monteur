

package entity


type CreateAdminRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	FullName string `json:"full_name" validate:"required,min=2"`
	Phone    string `json:"phone" validate:"omitempty,e164"`
}
