.PHONY: install build test dev clean

install:
	pnpm install

build:
	pnpm run build

test:
	pnpm run test

dev:
	pnpm run dev

clean:
	rm -rf node_modules packages/*/node_modules packages/*/dist dist
