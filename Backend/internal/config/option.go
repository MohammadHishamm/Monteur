package config

import (
	"github.com/OmarHosny18/APP-frontend/common"
)

var (
	Options Option
)

type Option struct {
	Name    string
	Version string
}

func InitOptions() *Option {
	return &Option{
		Name:    common.GetEnvString("NAME", "Ariatoon"),
		Version: common.GetEnvString("GH_VERSION", "v1.0.0"),
	}
}
