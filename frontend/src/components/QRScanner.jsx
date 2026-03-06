import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
    const [scanResult, setScanResult] = useState(null);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText, decodedResult) {
            // Handle the scanned code as you like, for example:
            console.log(`Code matched = ${decodedText}`, decodedResult);
            setScanResult(decodedText);
            onScan(decodedText);
            scanner.clear();
        }

        function onScanFailure() {
            // handle scan failure, usually better to ignore and keep scanning.
            // console.warn(`Code scan error = ${error}`);
        }

        return () => {
            scanner.clear().catch(() => {
                console.error("Scanner clear failed");
            });
        };
    }, [onScan]);

    return (
        <div className="w-full max-w-sm mx-auto">
            <div id="reader" width="600px"></div>
            {scanResult && <p className="text-center mt-4 text-green-600 font-bold">Scanned: {scanResult}</p>}
        </div>
    );
};

export default QRScanner;
