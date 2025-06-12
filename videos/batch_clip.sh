ffmpeg -i test.mp4 \
  -vf "scale=720:-2" \
  -c:v libx264 -crf 28 -preset medium \
  -an \
  -movflags +faststart \
  clip_compressed.mp4
