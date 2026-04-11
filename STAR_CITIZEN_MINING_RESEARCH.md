# Star Citizen Mining Research Notes

_Last updated: 2026-04-11_

This file is intended for GitHub and for import into the Star Ops Item Finder project as a research reference. It focuses on where mineable materials can be found in Star Citizen, with emphasis on space, planetary surfaces, moons, and caves.

## Scope

This document covers:
- mining environments
- confirmed material-location mappings
- asteroid composition classes for space mining
- mining method requirements
- confidence and verification notes

## Mining environments

Star Citizen mining currently happens in three main environments:
- open space / asteroid fields
- planetary or moon surfaces
- underground caves / caverns

Mining is done primarily with ship-mounted mining equipment or with handheld mining tools. Surface mining applies to planets, moons, and asteroids. Sub-surface mining is commonly called FPS mining and uses the Pyro RYT Multi-Tool with an OreBit Mining Attachment. A MacFlex "Rucksack" Backpack is commonly used alongside it.

## Confirmed material-location mappings

### Hadanite
- Type: gemstone / small-scale mineable
- Environment: surface, sometimes attached to asteroids
- Mining requirement: handheld mining tool for some deposits; at least a size 0 mining laser for others
- Confirmed locations:
  - Aberdeen
  - Arial
  - Daymar
  - Wala
  - Lyria
  - Magda
  - Ignis
- Confidence: high
- Verification status: community_verified / multi-source-ready

Notes:
Hadanite is one of the clearest material-location mappings currently available. The StarCitizen.tools page states it is found in small-scale rock deposits, can appear on planetary surfaces or attached to asteroids, and some deposits require more power than a handheld tool.

### Janalite
- Type: rare mineral / small-scale deposit
- Environment: sand caves
- Mining requirement: FPS mining
- Confirmed locations:
  - Daymar sand caves
  - Magda sand caves
  - Ita sand caves
- Confidence: high
- Verification status: community_verified / multi-source-ready

Notes:
Janalite is one of the strongest cave-specific mappings currently available.

### Quantanium (Raw)
- Type: volatile ore
- Environment: asteroids or ore deposits
- Mining requirement: ship mining
- Special handling:
  - degrades over time
  - must be delivered to a refinery deck quickly
  - can explode if not processed in time
- Confidence: high for mining behavior; medium for exact hotspot mapping
- Verification status: community_verified

Notes:
For app purposes, Raw Quantanium should be tagged as volatile and refinery-sensitive.

## Space mining research: asteroid classes

Asteroid classes are one of the best ways to encode space-mining intelligence in the app. The following compositions are described on StarCitizen.tools.

### C-Type asteroids
- Usually contain:
  - Quartz
  - Copper
  - Tungsten
  - Iron
- Small quantities may include:
  - Quantanium
  - Stileron
- Notes:
  - prolific
  - often low resistance and low instability

### E-Type asteroids
- Usually contain:
  - Silicon
  - Iron
  - Tungsten
  - Corundum
- Small quantities may include:
  - Quantanium
  - Laranite
- Notes:
  - medium to high resistance
  - medium instability

### I-Type asteroids
- Current location note:
  - currently only found in Pyro
- Notes:
  - low resistance
  - medium instability
- Composition note:
  - full composition not captured in this research pass

### M-Type asteroids
- Usually contain:
  - Quartz
  - Copper
  - Silicon
  - Titanium
- Small quantities may include:
  - Quantanium
  - Riccite
  - Stileron
- Notes:
  - high resistance
  - high instability

### P-Type asteroids
- Usually contain:
  - Quartz
  - Copper
  - Iron
  - Titanium
- Small quantities may include:
  - Quantanium
  - Riccite
  - Stileron
- Notes:
  - high resistance
  - high instability

### Q-Type asteroids
- Usually contain:
  - Quartz
  - Copper
  - Iron
  - Titanium
- Small quantities may include:
  - Quantanium
  - Stileron
- Notes:
  - low resistance
  - medium instability

### S-Type asteroids
- Usually contain:
  - Titanium
  - Quartz
  - Iron
  - Tungsten
- Small quantities may include:
  - Quantanium
  - Riccite
- Notes:
  - low resistance
  - medium instability

## App-ready data modeling guidance

Recommended fields for the mining data model:
- name
- type
- environment
- miningMethod
- toolRequirement
- vehicleRequirement
- confirmedLocations
- possibleLocations
- asteroidTypes
- volatile
- requiresRefining
- verificationStatus
- confidence
- sourceReferences
- notes

### Example modeling

#### Hadanite
- type: gemstone
- environment:
  - surface
  - asteroid_attached
- miningMethod:
  - fps
  - size0_plus
- confirmedLocations:
  - Aberdeen
  - Arial
  - Daymar
  - Wala
  - Lyria
  - Magda
  - Ignis
- verificationStatus: community_verified
- confidence: high

#### Janalite
- type: cave_special
- environment:
  - sand_cave
- miningMethod:
  - fps
- confirmedLocations:
  - Daymar
  - Magda
  - Ita
- verificationStatus: community_verified
- confidence: high

#### Quantanium (Raw)
- type: ore
- environment:
  - space
  - surface
- miningMethod:
  - ship
- volatile: true
- requiresRefining: true
- verificationStatus: community_verified
- confidence: high for handling, medium for exact hotspots

## Confidence notes

Most reliable from this pass:
- general mining environments and methods
- Hadanite world list
- Janalite sand cave locations
- Quantanium volatility and refinery behavior
- asteroid type composition guidance

Use caution with:
- older broad mineral summary pages
- community hotspot lists that do not align across sources
- exact patch-sensitive spawn density claims

## Recommended next data steps

For the app and backend, split future mining data into:
- confirmed locations
- possible locations
- mining environment
- asteroid class targeting
- patch-sensitive notes
- verification status per record

You may also want separate JSON exports later such as:
- mining-materials.json
- mining-locations.json
- asteroid-classes.json
- cave-materials.json

## Sources

- Star Citizen Wiki: Mining
- Star Citizen Wiki: Hadanite
- Star Citizen Wiki: Janalite
- Star Citizen Wiki: Quantanium (Raw)
- Star Citizen Wiki: Asteroid
