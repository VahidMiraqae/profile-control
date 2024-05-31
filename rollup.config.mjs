export default {
    input: 'script.js',
    output: {
        file: 'script1.js',
        format: 'iife'
    },
    watch: {
        include: ["*", "src/*"]
    }
}