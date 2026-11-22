# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\separation-e2e.test.js >> ONNX Separation Test
- Location: e2e\separation-e2e.test.js:5:1

# Error details

```
Error: page.evaluate: TypeError: Failed to set the 'files' property on 'HTMLInputElement': Failed to convert value to 'FileList'.
    at eval (eval at evaluate (:370:30), <anonymous>:56:19)
    at new Promise (<anonymous>)
    at eval (eval at evaluate (:370:30), <anonymous>:2:12)
    at UtilityScript.evaluate (<anonymous>:372:16)
    at UtilityScript.<anonymous> (<anonymous>:1:44)
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - button "Home" [ref=e5] [cursor=pointer]: ← Home
  - heading "Play" [level=2] [ref=e6]
  - generic [ref=e7]:
    - generic [ref=e8] [cursor=pointer]:
      - generic [ref=e9]: 🎵
      - heading "Open song" [level=3] [ref=e10]
      - paragraph [ref=e11]: "Import song file: MP3, WAV"
    - button "Open song" [ref=e12] [cursor=pointer]
```