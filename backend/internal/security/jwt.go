package security

import (
	"time"

	"requirements-app/backend/internal/models"

	"github.com/golang-jwt/jwt/v5"
)

// AccessClaims — полезная нагрузка JWT токена.
type AccessClaims struct {
	UserID       uint   `json:"userId"`
	Email        string `json:"email"`
	FullName     string `json:"fullName"`
	Organization string `json:"organization"`
	AccessLevel  string `json:"accessLevel"`
	IsSuperuser  bool   `json:"isSuperuser"`
	jwt.RegisteredClaims
}

// JWTService инкапсулирует создание и парсинг access token.
type JWTService struct {
	secret []byte
	ttl    time.Duration
}

// NewJWTService создаёт сервис JWT.
func NewJWTService(secret string) *JWTService {
	return &JWTService{
		secret: []byte(secret),
		ttl:    24 * time.Hour,
	}
}

// GenerateAccessToken подписывает access token для пользователя.
func (s *JWTService) GenerateAccessToken(user *models.User) (string, error) {
	now := time.Now()

	claims := AccessClaims{
		UserID:       user.ID,
		Email:        user.Email,
		FullName:     user.FullName,
		Organization: user.Organization,
		AccessLevel:  user.AccessLevel,
		IsSuperuser:  user.IsSuperuser,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.Email,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

// ParseAccessToken валидирует токен и возвращает claims.
func (s *JWTService) ParseAccessToken(tokenString string) (*AccessClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &AccessClaims{}, func(token *jwt.Token) (interface{}, error) {
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*AccessClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}
