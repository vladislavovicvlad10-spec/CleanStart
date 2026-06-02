# App Icon Placeholder

CleanStart does not include a fake or broken icon file.

For release builds, add a real Windows icon here:

```text
assets/app.ico
```

Icon requirements:

- `.ico` format
- Includes 256x256 and 32x32 sizes
- Does not use copyrighted third-party artwork
- Matches the safety-first utility tone

The build script automatically uses `assets/app.ico` if the file exists.
