(function () {
    // Chặn chuột phải
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Chặn chọn văn bản
    document.addEventListener('selectstart', function (e) { e.preventDefault(); });

    // Chặn sự kiện copy/cut
    document.addEventListener('copy', function (e) { e.preventDefault(); });
    document.addEventListener('cut', function (e) { e.preventDefault(); });

    // Chặn phím tắt
    document.addEventListener('keydown', function (e) {
        var k = e.key ? e.key.toLowerCase() : '';
        // Ctrl/Cmd + C, X, A, U, S, P
        if ((e.ctrlKey || e.metaKey) && ['c','x','a','u','s','p'].includes(k)) {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I/J/C/K (DevTools)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i','j','c','k'].includes(k)) {
            e.preventDefault();
            return false;
        }
        // F12 (DevTools)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
    });

    // CSS chặn bôi đen text
    var s = document.createElement('style');
    s.textContent = '* { -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; user-select: none !important; } img { pointer-events: none !important; }';
    document.head.appendChild(s);
})();
