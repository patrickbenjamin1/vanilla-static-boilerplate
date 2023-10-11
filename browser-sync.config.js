module.exports = {
  watch: true,
  server: {
    baseDir: 'dist',
    serveStaticOptions: {
      extensions: ['html'],
    },
    index: 'index.html',
  },
  files: ['./dist/**/*'],
}
