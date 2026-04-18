# CropSentinel Pilot Plan

## Objective

Deploy one working pilot unit for your friend's father and learn what breaks in real field use.

## Pilot Success Criteria

- ESP32 posts sensor data continuously for multiple days
- dashboard shows device heartbeat and fresh readings
- camera path produces pest detections with visible overlays
- farmer can understand the local display without laptop help

## Pilot Build

### Node

- one ESP32 field node
- one display
- one moisture sensor
- one humidity/temperature sensor
- one enclosure
- one power source

### Vision

- one phone or fixed camera pointed at the crop zone
- MATLAB detection running on a nearby laptop/desktop

## Pilot Tests

### Bench Test

- upload ESP32 firmware
- verify OLED readings
- verify website updates
- validate moisture calibration

### Controlled Field Test

- run in semi-outdoor condition for 1 to 3 days
- check Wi-Fi strength
- check enclosure temperature
- verify no false sensor jumps

### Real Pilot

- place in intended crop environment
- collect events for at least 1 week
- note false positives, missed detections, and maintenance pain points

## Things To Watch Closely

- moisture sensor stability over time
- humidity sensor placement
- camera angle and sun glare
- power interruptions
- backend uptime on the host machine

## Recommended Version 1 Rule

Do not automate pesticide or pump actions in the first pilot.

Version 1 should:

- sense
- detect
- display
- alert

Only after the pilot is trustworthy should the product move toward automatic actuation.
