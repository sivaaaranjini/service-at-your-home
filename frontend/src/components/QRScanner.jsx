import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner = ({ onScan }) => {
    const [scanResult, setScanResult] = useState(null);
    const [error, setError] = useState(null);
    const [isScannerStarted, setIsScannerStarted] = useState(false);
    const scannerRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
        const scannerId = "reader";
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        const startScanner = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: "environment" } 
                });
                streamRef.current = stream;

                await html5QrCode.start(
                    { deviceId: { exact: stream.getVideoTracks()[0].getSettings().deviceId } },
                    config,
                    (decodedText) => {
                        console.log(`Code matched = ${decodedText}`);
                        setScanResult(decodedText);
                        onScan(decodedText);
                        // Trigger stopping
                        if (scannerRef.current) {
                            scannerRef.current.stop().catch(console.error);
                            stream.getTracks().forEach(t => t.stop());
                        }
                    },
                    () => {}
                );
                setIsScannerStarted(true);
                setError(null);
            } catch (err) {
                try {
                    await html5QrCode.start({ facingMode: "environment" }, config, (decodedText) => {
                        setScanResult(decodedText);
                        onScan(decodedText);
                        html5QrCode.stop().catch(console.error);
                    }, () => {});
                    setIsScannerStarted(true);
                    setError(null);
                } catch (fallbackErr) {
                    setError(fallbackErr.message || "Camera access denied.");
                    setIsScannerStarted(false);
                }
            }
        };

        startScanner();

        return () => {
            // SYNC CLEANUP - This runs immediately when modal closes
            if (scannerRef.current) {
                // Check if the scanner state is currently scanning or paused before attempting to stop
                const state = scannerRef.current.getState();
                if (state > 1) { // 2 = SCANNING, 3 = PAUSED
                    scannerRef.current.stop().catch(err => {
                        console.warn("[QRScanner] Suppressed stop error:", err);
                    });
                }
                scannerRef.current = null;
            }
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => {
                    track.stop(); // This is SYNC and kills the hardware link
                });
                streamRef.current = null;
            }

            // Kill any video elements inside the reader div
            const readerDiv = document.getElementById(scannerId);
            if (readerDiv) {
                const videos = readerDiv.querySelectorAll('video');
                videos.forEach(v => {
                    v.pause();
                    v.srcObject = null;
                });
            }
            
            setIsScannerStarted(false);
        };
    }, [onScan]);

    return (
        <div className="w-full max-w-sm mx-auto p-4 bg-gray-900 rounded-2xl min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
            {!isScannerStarted && !error && (
                <div className="text-center text-white">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm font-bold opacity-75">Initializing Optical Matrix...</p>
                </div>
            )}

            {error && (
                <div className="text-center px-4">
                    <div className="text-red-500 text-4xl mb-4">⚠️</div>
                    <p className="text-white text-sm font-bold mb-4">{error}</p>
                    <button onClick={() => window.location.reload()} className="bg-white/10 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition">Retry Access</button>
                    <p className="text-[10px] text-gray-500 mt-4 leading-relaxed">Ensure camera permissions are granted and you are using a secure (HTTPS) connection.</p>
                </div>
            )}

            <div id="reader" className={`w-full ${!isScannerStarted || error ? 'hidden' : 'block'}`}></div>
            
            {scanResult && (
                <div className="absolute inset-x-0 bottom-4 px-4">
                    <p className="bg-green-500 text-white text-center py-2 rounded-xl text-xs font-black shadow-lg animate-bounce">
                        VALID IDENTITY DETECTED
                    </p>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
