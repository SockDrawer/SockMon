module.exports = function(a, b, block) {
    return a == b ? block.fn() : block.inverse();
};