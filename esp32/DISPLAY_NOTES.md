# Display Notes

## Why Your Current Display Shows Nothing

The main ESP32 sketch in this repo uses:

- `Adafruit_SSD1306`
- an `SSD1306 OLED` graphics display

Your display name `2004A v1.5` usually means:

- `20x4 character LCD`
- often paired with an `I2C backpack`

That is a different display type, so the OLED sketch will not drive it.

## What To Use Instead

Use this sketch:

- `esp32/cropsentinel_esp32_lcd2004.ino`

It is written for a `2004A 20x4 LCD with I2C backpack`.

## Wiring For LCD 2004 I2C

- `VCC` -> `5V`
- `GND` -> `GND`
- `SDA` -> `GPIO 21`
- `SCL` -> `GPIO 22`

## Important

If your LCD has no I2C backpack, this sketch will not work.

A display with I2C backpack usually has only 4 pins:

- `GND`
- `VCC`
- `SDA`
- `SCL`

If your LCD has many pins in a long row like `VSS, VDD, VO, RS, RW, E, D0...D7`, then it is a parallel LCD and needs different wiring/code.

## If Screen Still Does Not Show

Most common causes:

1. wrong display type
2. wrong I2C address
3. contrast knob on LCD backpack needs adjustment
4. VCC should be `5V` instead of `3.3V`

## I2C Address

This sketch assumes:

- `0x27`

If nothing appears, try changing:

```cpp
LiquidCrystal_I2C lcd(0x27, 20, 4);
```

to:

```cpp
LiquidCrystal_I2C lcd(0x3F, 20, 4);
```
