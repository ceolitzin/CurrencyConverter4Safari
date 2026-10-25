APP_NAME = Currency Converter
BUILT_APP = build/Build/Products/Release/$(APP_NAME).app
INSTALLED_APP = /Applications/$(APP_NAME).app
LSREGISTER = /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

# Apple development team ID. Without it the app is signed to run locally only,
# and Safari needs Develop > Allow Unsigned Extensions to load it.
TEAM ?=
SIGNING = $(if $(TEAM),DEVELOPMENT_TEAM=$(TEAM),CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual)

.PHONY: test build install clean

test:
	node --test tests/*.test.js

# Always clean: a leftover extension signed with another identity makes the build fail
build:
	xcodebuild -project "xcode/$(APP_NAME).xcodeproj" -scheme "$(APP_NAME)" \
		-configuration Release -derivedDataPath build $(SIGNING) clean build

install: build
	rm -rf "$(INSTALLED_APP)"
	ditto "$(BUILT_APP)" "$(INSTALLED_APP)"
	@# macOS registers every app Xcode builds; drop the copy in build/ so Safari doesn't list the extension twice
	pluginkit -r "$(BUILT_APP)/Contents/PlugIns/$(APP_NAME) Extension.appex"
	"$(LSREGISTER)" -u "$(BUILT_APP)"
	rm -rf "$(BUILT_APP)"
	open "$(INSTALLED_APP)"
	@echo "Now enable the extension in Safari > Settings > Extensions."

clean:
	-@pluginkit -r "$(BUILT_APP)/Contents/PlugIns/$(APP_NAME) Extension.appex" 2>/dev/null
	-@"$(LSREGISTER)" -u "$(BUILT_APP)" 2>/dev/null
	rm -rf build
