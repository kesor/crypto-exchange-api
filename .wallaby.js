module.exports = function(wallaby) {
    return {
        files: ['src/**/*.js'],
        tests: ['test/**/*.test.js'],
        debug: false,
        env: {
            type: 'node'
        },
        compilers: {
            '**/*.js': wallaby.compilers.babel({
              presets: [ 'env', 'flow' ],
              plugins: ['transform-runtime']
            })
        }
    }
}