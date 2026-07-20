BACKEND_DIR := backend
FRONTEND_DIR := frontend

.PHONY: backend-run backend-test backend-build frontend-dev frontend-build frontend-lint frontend-test verify

backend-run:
	cd $(BACKEND_DIR) && go run .

backend-test:
	cd $(BACKEND_DIR) && go test ./...

backend-build:
	cd $(BACKEND_DIR) && go build ./...

frontend-dev:
	pnpm --dir $(FRONTEND_DIR) run dev

frontend-build:
	pnpm --dir $(FRONTEND_DIR) run build

frontend-lint:
	pnpm --dir $(FRONTEND_DIR) run lint

frontend-test:
	pnpm --dir $(FRONTEND_DIR) exec vitest run

verify: backend-test backend-build frontend-lint frontend-test frontend-build
