package common

import "time"

const (
	Admin     string = "admin"
	Moderator string = "moderator"
	Publisher string = "publisher"

	DefaultUserName  string = "aria-user"
	DefaultFirstName string = "Aria"
	DefaultLastName  string = "User"

	URLMangaPage        string = "series/manga/{{mangaID}}"
	URLMangaTagPage     string = "series/manga/tags/{{tagID}}"
	URLMangaEpisodePage string = "series/manga/{{mangaID}}/episodes/{{episodeID}}"
	URLNovelPage        string = "series/novels/{{novelID}}"
	URLNovelTagPage     string = "series/novels/tags/{{tagID}}"
	URLNovelEpisodePage string = "series/novels/{{novelID}}/episodes/{{episodeID}}"

	URLMangaParam   string = "{{mangaID}}"
	URLNovelParam   string = "{{novelID}}"
	URLTagParam     string = "{{tagID}}"
	URLEpisodeParam string = "{{episodeID}}"

	FiveMinutesInSeconds int = 60 * 5
	TwoDaysInSeconds     int = 60 * 60 * 24 * 2
	SevenDaysInSeconds   int = 60 * 60 * 24 * 7

	GateKeeperDuration        string = "1m"
	GateKeeperHeaderRequestID string = "X-Request-ID"
	GateKeeperHeaderTimeStamp string = "X-TimeStamp"

	RatelimiterDuration = 30 * time.Second

	ImageJPGQuality   int = 90
	ImageColorCluster int = 150

	CtxSessionIDKey SessionIDKey = "sessionID"

	SessionTTL = TwoDaysInSeconds
)

type SessionIDKey string
