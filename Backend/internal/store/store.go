package store

import (
	"context"
	"database/sql"

	"github.com/OmarHosny18/APP-frontend/internal/apperror"
)

type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type Store struct {
	DB               *sql.DB
	User             *UserStore
	Admin            *AdminStore
	AdminDashboard   *AdminDashboardStore
	Token            *TokenStore
	Message          *MessageStore
	Job              *JobStore
	Proposal         *ProposalStore
	Project          *ProjectStore
	Showcase         *ShowcaseStore
	SavedFreelancer  *SavedFreelancerStore
	Review           *ReviewStore
	Verification     *VerificationStore
}

func New(db *sql.DB) *Store {
	return &Store{
		DB:              db,
		User:            newUserStore(db),
		Admin:           newAdminStore(db),
		AdminDashboard:  newAdminDashboardStore(db),
		Token:           newTokenStore(db),
		Message:         newMessageStore(db),
		Job:             newJobStore(db),
		Proposal:        newProposalStore(db),
		Project:         newProjectStore(db),
		Showcase:        newShowcaseStore(db),
		SavedFreelancer: newSavedFreelancerStore(db),
		Review:          newReviewStore(db),
		Verification:    newVerificationStore(db),
	}
}

func WithTx(ctx context.Context, db *sql.DB, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelReadCommitted}) // Explicit isolation level
	if err != nil {
		return apperror.ErrTxStart.WithDetailError(err)
	}

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return apperror.ErrTxRollback.WithDetailError(err).WithDetailError(rbErr)
		}
		return apperror.ErrTxCommit.WithDetailError(err)
	}

	if err := tx.Commit(); err != nil {
		return apperror.ErrTxCommit.WithDetailError(err)
	}

	return nil
}
