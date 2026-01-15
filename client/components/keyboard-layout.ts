export interface KeyData {
  label: string
  code: string
  width?: number
  color?: string
  textColor?: string
  fontSize?: number
  align?: "left" | "center" | "right"
}

// Standard 60% layout approximation
export const KEYBOARD_LAYOUT: KeyData[][] = [
  [
    { label: "Esc", code: "Escape", color: "#ef4444", textColor: "white", fontSize: 0.18, align: "left" },
    { label: "1", code: "Digit1" },
    { label: "2", code: "Digit2" },
    { label: "3", code: "Digit3" },
    { label: "4", code: "Digit4" },
    { label: "5", code: "Digit5" },
    { label: "6", code: "Digit6" },
    { label: "7", code: "Digit7" },
    { label: "8", code: "Digit8" },
    { label: "9", code: "Digit9" },
    { label: "0", code: "Digit0" },
    { label: "-", code: "Minus" },
    { label: "=", code: "Equal" },
    { label: "Bksp", code: "Backspace", width: 2, color: "#0ea5e9", textColor: "white", fontSize: 0.2, align: "right" },
  ],
  [
    { label: "Tab", code: "Tab", width: 1.5, fontSize: 0.2, align: "left" },
    { label: "Q", code: "KeyQ" },
    { label: "W", code: "KeyW" },
    { label: "E", code: "KeyE" },
    { label: "R", code: "KeyR" },
    { label: "T", code: "KeyT" },
    { label: "Y", code: "KeyY" },
    { label: "U", code: "KeyU" },
    { label: "I", code: "KeyI" },
    { label: "O", code: "KeyO" },
    { label: "P", code: "KeyP" },
    { label: "[", code: "BracketLeft" },
    { label: "]", code: "BracketRight" },
    { label: "\\", code: "Backslash", width: 1.5 },
  ],
  [
    { label: "Caps", code: "CapsLock", width: 1.8, fontSize: 0.2, align: "left" },
    { label: "A", code: "KeyA" },
    { label: "S", code: "KeyS" },
    { label: "D", code: "KeyD" },
    { label: "F", code: "KeyF" },
    { label: "G", code: "KeyG" },
    { label: "H", code: "KeyH" },
    { label: "J", code: "KeyJ" },
    { label: "K", code: "KeyK" },
    { label: "L", code: "KeyL" },
    { label: ";", code: "Semicolon" },
    { label: "'", code: "Quote" },
    { label: "Enter", code: "Enter", width: 2.2, color: "#eab308", textColor: "white", fontSize: 0.2, align: "right" },
  ],
  [
    {
      label: "Shift",
      code: "ShiftLeft",
      width: 2.3,
      color: "#3f3f46",
      textColor: "white",
      fontSize: 0.2,
      align: "left",
    },
    { label: "Z", code: "KeyZ" },
    { label: "X", code: "KeyX" },
    { label: "C", code: "KeyC" },
    { label: "V", code: "KeyV" },
    { label: "B", code: "KeyB" },
    { label: "N", code: "KeyN" },
    { label: "M", code: "KeyM" },
    { label: ",", code: "Comma" },
    { label: ".", code: "Period" },
    { label: "/", code: "Slash" },
    {
      label: "Shift",
      code: "ShiftRight",
      width: 2.7,
      color: "#3f3f46",
      textColor: "white",
      fontSize: 0.2,
      align: "right",
    },
  ],
  [
    { label: "Ctrl", code: "ControlLeft", width: 1.5, fontSize: 0.2, color: "#e4e4e7" },
    { label: "Win", code: "MetaLeft", width: 1.2, fontSize: 0.2, color: "#e4e4e7" },
    { label: "Alt", code: "AltLeft", width: 1.2, fontSize: 0.2, color: "#e4e4e7" },
    { label: "", code: "Space", width: 6.5 },
    { label: "Alt", code: "AltRight", width: 1.2, fontSize: 0.2, color: "#e4e4e7" },
    { label: "Fn", code: "Fn", width: 1.2, fontSize: 0.2, color: "#e4e4e7" },
    { label: "Ctrl", code: "ControlRight", width: 1.5, fontSize: 0.2, color: "#e4e4e7" },
  ],
]
