.PHONY: all vsix compiler deb releases clean test test-ai

all: vsix deb releases

vsix:
	VERSION=$$(grep '\$$VERSION\s*=\s*' compiler/omniflux.of | cut -d'"' -f2 || echo "1.0.1"); \
	sed -i "s/\"version\": \"[^\"]*\"/\"version\": \"$$VERSION\"/" editors/vscode/package.json
	mkdir -p editors/vscode/assets
	cp assets/icon-16.png editors/vscode/assets/icon-16.png
	cp assets/icon-32.png editors/vscode/assets/icon-32.png
	cp assets/logo.png editors/vscode/assets/logo.png
	cp LICENSE editors/vscode/LICENSE
	cp README.md editors/vscode/README.md
	cd editors/vscode && npx -y @vscode/vsce package

compiler: omniflux

omniflux: compiler/omniflux.of compiler/bundler.of compiler/validator.of compiler/transpiler.of compiler/symbols.of stdlib/system.of stdlib/network.of
	omniflux compiler/omniflux.of --compile-only --force
	cp compiler/omniflux .

deb: vsix compiler
	./build_deb.sh

releases: deb
	./build_releases.sh

test: compiler
	./omniflux regressiontest/runner.of

test-ai: compiler
	./omniflux regressiontest/runner_ai.of --strict --force

clean:
	rm -rf editors/vscode/assets
	rm -f editors/vscode/LICENSE editors/vscode/README.md
	rm -f editors/vscode/*.vsix
	rm -f omniflux.deb
	rm -rf .omniflux_cache
