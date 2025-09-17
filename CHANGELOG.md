# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.2 - 2025-04-09

### Fixed

- Correct an issue with selecting default step when a special version handling is needed
- Correct translations

## 1.1.1 - 2025-04-08

### Fixed

- Remove unscoped <label> CSS rule

## 1.1.0 - 2025-04-08

### Added

- Support for Nextcloud 30, 31 and 32

### Changed

- Allows to support multiple selectors depending on server and app version
- Switch build system from Webpack to Vite
- Translations

### Removed

- Support for Nextcloud 29

## 1.0.2 - 2024-10-01

### Added

- Support link to app metadata
- German translation

### Changed

- Dependencies updates

## 1.0.1 - 2024-08-21

### Fixed

 - Translation fixes
 - Bug sometimes preventing users from signing in

## 1.0.0 - 2024-07-29

### Added

 - Translatable tutorials
 - Better default tutorials
 - Structure file for tutorials
 
### Fixed

 - Better fetching of tutorials from backend
 - Remove link to disabled apps
 - Fix tooltip outside of viewport
 - Improved performance

### Removed

 - Support for phones and small screens (broken)

## 0.2.1 - 2024-06-20

### Fixed

 - Launching intros after First Run Wizard and Terms Of Service
 - Slightly larger exit intro button in tooltips
 - Buttons "Enable/Disable all intros" in settings are now secondary styled

## 0.2.0 - 2024-06-14

### Fixed

 - App detection (better handling of different urls)
 - Bug on redirecting when clicking on a link in an intro tooltip
 - Now disabling intro when closing it before the last step

### Added

 - "Go to intro" buttons in Intros settings
 - "Enable all intros" buttons in Intros settings

## 0.1.0 - 2024-06-03  

First release
