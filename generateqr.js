/**
 * @fileoverview Create QR Code from input values.
 */
(function (qrcodegen, i18nUtil, setTextInsertValue) {
    'use strict';

    /* ---- Util functions ---- */

    /**
     * Convert array to readable string.
     * @param {Array.<string>} array array to convert to string
     * @return {string} converted string
     */
    function arrayToStr(array) {
        return '[' + array.join(', ') + ']';
    }

    /* ---- DOM util functions ---- */

    /**
     * Clear all elements in an element.
     * @param {Element} element outer element to clear
     */
    function clearElement(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

    /**
     * Get the value of the checked input in radio inputs.
     * @param {NodeList} elements radio inputs
     * @param {string} defaultValue default value
     * @return {string} the value of the checked input
     */
    function getRadioValue(elements, defaultValue) {
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].checked) {
                return elements[i].value;
            }
        }
        return defaultValue;
    }

    /* ---- QR Code related util functions ---- */

    /**
     * Convert 'LMQH' Error correction string to qrcodegen.QrCode.Ecc object.
     * @param {string} eccStr 'LMQH' Error correction string to convert
     * @return {Ecc} converted qrcodegen.QrCode.Ecc level
     */
    function convStrToQrEcc(eccStr) {
        if (eccStr === 'L') {
            return qrcodegen.QrCode.Ecc.LOW;
        } else if (eccStr === 'M') {
            return qrcodegen.QrCode.Ecc.MEDIUM;
        } else if (eccStr === 'Q') {
            return qrcodegen.QrCode.Ecc.QUARTILE;
        } else if (eccStr === 'H') {
            return qrcodegen.QrCode.Ecc.HIGH;
        } else {
            // default
            return qrcodegen.QrCode.Ecc.LOW;
        }
    }

    /**
     * Convert qrcodegen.QrCode.Ecc object to 'LMQH' Error correction string.
     * @param {Ecc} ecc qrcodegen.QrCode.Ecc level
     * @return {string} converted 'LMQH' Error correction string
     */
    function convQrEccToStr(ecc) {
        return ['L', 'M', 'Q', 'H'][ecc.ordinal];
    }

    /**
     * Convert qrcodegen.QrSegment.Mode object to string.
     * @param {Mode} mode qrcodegen.QrSegment.Mode object
     * @return {string} converted string
     */
    function convQrModeToStr(mode) {
        if (mode === qrcodegen.QrSegment.Mode.NUMERIC) {
            return 'NUMERIC';
        } else if (mode === qrcodegen.QrSegment.Mode.ALPHANUMERIC) {
            return 'ALPHANUMERIC';
        } else if (mode === qrcodegen.QrSegment.Mode.BYTE) {
            return 'BYTE';
        } else if (mode === qrcodegen.QrSegment.Mode.KANJI) {
            return 'KANJI';
        } else {
            return 'unknown';
        }
    }

    /**
     * Get cell size from version.
     * @param {number} version version
     * @return {number} converted cell size
     */
    function getCellSizeOfVersion(version) {
        // version 1: 21 cells
        // 4 cells increase per version
        return version * 4 + 17;
    }

    /* ---- Get input values ---- */

    /**
     * Get input values from the from in the HTML.
     * @return {Object} input values
     */
    function getInputValues() {
        var inputForm = document.querySelector('form#input');

        var result = {};
        result.inputText = inputForm.querySelector('[name=inputText]').value;
        result.eccAuto = inputForm.querySelector('[name=eccAuto]').checked;
        result.ecc = convStrToQrEcc(getRadioValue(inputForm.querySelectorAll('[name=ecc]'), null));
        result.margin = parseInt(inputForm.querySelector('[name=margin]').value, 10);
        result.scale = parseInt(inputForm.querySelector('[name=scale]').value, 10);
        result.minVersion = parseInt(inputForm.querySelector('[name=minVersion]').value, 10);
        result.mask = parseInt(inputForm.querySelector('[name=mask]').value, 10);
        return result;
    }

    /* ---- Generate QR Code ---- */

    /**
     * set div#stat.
     * @param {Element} statDiv stat Div to set
     * @param {HTMLCanvasElement} canvas canvas to draw QR Code
     * @param {Object} input input values
     * @param {Array.<qrcodegen.QrSegment>} segs QrSegment object
     * @param {Array.<qrcodegen.QrCode>} qr QrCode object
     */
    function setStats(statDiv, canvas, input, segs, qr) {
        var cellSize = getCellSizeOfVersion(qr.version);

        var versionSpan = document.createElement('span');
        versionSpan.innerText = i18nUtil.i18n.getMessage('statsVersionLabel', [qr.version]);
        versionSpan.title = i18nUtil.i18n.getMessage('statsVersionCellSizeTitle', [cellSize]);
        statDiv.appendChild(versionSpan);

        statDiv.appendChild(document.createTextNode(', '));

        var sizeSpan = document.createElement('span');
        sizeSpan.innerText = i18nUtil.i18n.getMessage('statsSizeLabel', [cellSize, canvas.width]);
        sizeSpan.title = i18nUtil.i18n.getMessage('statsSizeTitle', [cellSize, input.margin, input.scale]);
        statDiv.appendChild(sizeSpan);

        statDiv.appendChild(document.createElement('br'));

        var miscSpan = document.createElement('span');
        miscSpan.innerText =
            i18nUtil.i18n.getMessage('statsMaskLabel', [qr.mask]) + ', ' +
            i18nUtil.i18n.getMessage('statsEccLabel', [convQrEccToStr(qr.errorCorrectionLevel)]) + ', ' +
            i18nUtil.i18n.getMessage('statsModesLabel', [arrayToStr(segs.map(function (seg) { return convQrModeToStr(seg.mode); }))]);
        statDiv.appendChild(miscSpan);
    }

    /**
     * Generate QR Code to canvas.
     */
    function generateQr() {
        var canvas = document.querySelector('canvas#qrcode');
        var statDiv = document.querySelector('#stat');
        var input = getInputValues();

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        clearElement(statDiv);
        statDiv.classList.remove('Error');

        try {
            var segs = qrcodegen.QrSegment.makeSegments(input.inputText);
            var qr = qrcodegen.QrCode.encodeSegments(segs, input.ecc, input.minVersion, qrcodegen.QrCode.MAX_VERSION, input.mask, input.eccAuto);
            qr.drawCanvas(input.scale, input.margin, canvas);
            setStats(statDiv, canvas, input, segs, qr);
        } catch (e) {
            // reset canvas
            canvas.width = canvas.height = 100;
            canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

            // set statDiv the error message
            statDiv.innerText = i18nUtil.i18n.getMessage('errorDescriptionLabel', [e]);
            statDiv.classList.add('Error');
        }

    }

    /* ---- Insert text event ---- */

    /**
     * Insert text to inputText textarea.
     * @param {string} insertedText inserted text
     */
    function insertText(insertedText) {
        var inputTextarea = document.querySelector('form#input [name=inputText]');
        var inputText = inputTextarea.value;
        var inputTextBefore = inputText.slice(0, inputTextarea.selectionStart);
        var inputTextAfter = inputText.slice(inputTextarea.selectionEnd);
        inputTextarea.value = inputTextBefore + insertedText + inputTextAfter;

        var insertedEnd = inputTextBefore.length + insertedText.length;
        inputTextarea.focus();
        inputTextarea.setSelectionRange(insertedEnd, insertedEnd);

        generateQr();
    }

    /**
     * Event listener for inserting text to inputText textarea.
     * @param {Event} event event
     * @this {HTMLAnchorElement}
     * @return {boolean} return false
     */
    function insertTextEvent(event) {
        var insertTextLink = this;
        var insertedText = insertTextLink.getAttribute('data-insert-value');

        insertText(insertedText);

        generateQr();

        event.preventDefault();
        return false;
    }

    /**
     * Insert URL to inputText textarea.
     */
    function insertUrl() {
        var insertUrlTextLink = document.querySelector('.insert-text[data-insert-type=url]');
        var insertedText = insertUrlTextLink.getAttribute('data-insert-value');

        insertText(insertedText);

        generateQr();
    }

    /**
     * Event listener for preventing default event
     * @param {Event} event event
     * @return {boolean} event event
     */
    function preventDefaultEvent(event) {
        event.preventDefault();
        return false;
    }

    /* ---- Open QR Code in new tab event ---- */

    /**
     * Event listener for opening QR Code in new tab.
     * @param {Event} event event
     */
    function openQr(event) {
        var canvas = document.querySelector('canvas#qrcode');
        var inputTextarea = document.querySelector('form#input [name=inputText]');

        var newWindow = window.open();

        var newStyle = newWindow.document.createElement('style');
        newWindow.document.head.appendChild(newStyle);
        newStyle.innerHTML =
            'body { background-color: gray; }\n' +
            '.Image { top:0; bottom: 0; left: 0; right: 0; position: absolute; margin: auto; }\n' +
            '.Image img { display: block; margin: 5px auto 5px auto; }\n' +
            '.Image textarea { display: block; width: 50%; max-height: 30%; margin-left: auto; margin-right: auto; }\n';

        var newDiv = newWindow.document.createElement('div');
        newDiv.classList.add('Image');
        newWindow.document.body.appendChild(newDiv);

        var newImg = newWindow.document.createElement('img');
        newImg.src = canvas.toDataURL();
        newDiv.appendChild(newImg);

        var newTextarea = newWindow.document.createElement('textarea');
        newTextarea.value = inputTextarea.value;
        newDiv.appendChild(newTextarea);
    }

    /* ---- Set events ---- */

    window.addEventListener('load', function () {
        i18nUtil.substituteAllElementsAndTextNodes(document);

        setTextInsertValue(insertUrl);

        var inputForm = document.querySelector('form#input');

        // generateQr
        ['propertychange', 'change', 'keyup', 'paste', 'input'].forEach(function (event) {
            inputForm.querySelector('[name=inputText]').addEventListener(event, generateQr);
            inputForm.querySelector('[name=margin]').addEventListener(event, generateQr);
            inputForm.querySelector('[name=scale]').addEventListener(event, generateQr);
            inputForm.querySelector('[name=minVersion]').addEventListener(event, generateQr);
        });
        ['propertychange', 'click', 'change'].forEach(function (event) {
            inputForm.querySelector('[name=eccAuto]').addEventListener(event, generateQr);
            var elements = inputForm.querySelectorAll('[name=ecc]');
            for (var i = 0; i < elements.length; i++) {
                elements[i].addEventListener(event, generateQr);
            }
        });
        ['propertychange', 'change', 'keyup', 'click'].forEach(function (event) {
            inputForm.querySelector('[name=mask]').addEventListener(event, generateQr);
        });

        // insert text event
        ['click'].forEach(function (event) {
            var elements = inputForm.querySelectorAll('.insert-text');
            for (var i = 0; i < elements.length; i++) {
                elements[i].addEventListener(event, insertTextEvent);
            }
        });

        ['mousedown'].forEach(function (event) {
            var elements = inputForm.querySelectorAll('.insert-text');
            for (var i = 0; i < elements.length; i++) {
                elements[i].addEventListener(event, preventDefaultEvent);
            }
        });

        // open QR Code in new tab
        document.querySelector('.open-qrcode').addEventListener('click', openQr);

        // Initial load
        generateQr();
    });

})(qrcodegen, i18nUtil, setTextInsertValue);
