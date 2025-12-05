// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.0.1                                                                                                                                              #UPDATE THIS PART, IT WILL INITIATE THE UPDATE FOR OTHERS WHEN THEY PRESS THE AAP BUTTON   
// @description  Popup alert for urgent minor repairs from specific sites
// @author       monimag
// @match        https://aap-na.corp.amazon.com/*
// @icon         https://www.google.com/s2/favicons?domain=amazon.com
// @updateURL    https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @downloadURL  https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    // Define urgent sites - Sites over 1P threshold
    const URGENT_SITES = ["STL5", "YVR2", "RDF2", "TPA1"];
    
    // Site prefixes that require urgent handling
    const URGENT_PREFIXES = ["RDU", "MCO", "FTW", "BFI", "DCA"];

    // Track if popup already shown for current work order
    let Id = null;

    // Check if site code is urgent
    function isUrgentSite(siteCode) {
        if (!siteCode) return false;
        const upperSiteCode = siteCode.toUpperCase().trim();
        
        // Must be exactly 4-5 characters (3-4 letters + 1-2 numbers)
        if (!/^[A-Z]{3,4}\d{1,2}$/.test(upperSiteCode)) {
            return false;
        }
        
        // Check exact matches
        if (URGENT_SITES.includes(upperSiteCode)) {
            return true;
        }
        
        // Check prefixes
        for (let prefix of URGENT_PREFIXES) {
            if (upperSiteCode.startsWith(prefix)) {
                return true;
            }
        }
        
        return false;
    }

    // Create and display the urgent popup
    function showUrgentPopup(siteCode) {
        // Remove existing popup if any
        const existingOverlay = document.getElementById('urgentSiteOverlay');
        if (existingOverlay) existingOverlay.remove();

        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'urgentSiteOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.75);
            z-index: 999999;
            display: flex;
            justify-content: center;
            align-items: center;
            animation: fadeIn 0.3s;
        `;

        // Create popup box
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: linear-gradient(to bottom, #fff 0%, #f9f9f9 100%);
            padding: 35px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            max-width: 550px;
            text-align: center;
            font-family: 'Segoe UI', Arial, sans-serif;
            border: 3px solid #ff9800;
            animation: slideIn 0.3s;
        `;

        popup.innerHTML = `
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes copySuccess {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
            </style>
            <div style="margin-bottom: 20px; animation: pulse 2s infinite;">
                <div style="background-color: #ff9800; width: 80px; height: 80px; margin: 0 auto; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);">
                    <span style="font-size: 48px;">⚠️</span>
                </div>
            </div>
            
            <h2 style="color: #ff9800; margin: 15px 0; font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                🚨 1P THRESHOLD ALERT 🚨
            </h2>
            
            <div style="background-color: #fff3cd; padding: 12px; border-radius: 8px; margin: 20px 0; border: 2px solid #ff9800;">
                <p style="font-size: 20px; margin: 0; color: #333; font-weight: bold;">
                    Site Code: <span style="color: #ff9800; font-size: 24px;">${siteCode}</span>
                </p>
            </div>
            
            <div style="text-align: center; background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ff9800;">
                <p style="font-size: 18px; line-height: 1.8; color: #333; margin: 0; font-weight: 600;">
                    ⚡ This work order is from a <span style="color: #d32f2f;">CRITICAL PRIORITY</span> site!
                </p>
                <div style="margin-top: 20px; padding: 15px; background-color: white; border-radius: 8px; border: 2px solid #ff9800;">
                    <p style="font-size: 20px; font-weight: bold; color: #d32f2f; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">
                        📊 SITE IS OVER 1P THRESHOLD TODAY
                    </p>
                </div>
            </div>
            
            <div style="background-color: #d32f2f; color: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 4px 8px rgba(211, 47, 47, 0.3);">
                <p style="margin: 0; font-weight: bold; font-size: 17px; letter-spacing: 0.5px; line-height: 1.6;">
                    ⚡ URGENT HANDLING REQUIRED ⚡<br>
                    <span style="font-size: 15px; font-weight: normal; margin-top: 8px; display: block;">
                        Priority assignment needed to meet site threshold targets
                    </span>
                </p>
            </div>

            <!-- Copy to Comments Section -->
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #2196F3;">
                <p style="margin: 0 0 10px 0; font-weight: bold; font-size: 15px; color: #1976d2; text-align: left;">
                    📋 Copy To Comments:
                </p>
                <div style="position: relative;">
                    <textarea id="urgentCommentText" readonly style="
                        width: 100%;
                        padding: 12px;
                        border: 2px solid #2196F3;
                        border-radius: 6px;
                        font-size: 14px;
                        font-family: 'Segoe UI', Arial, sans-serif;
                        resize: none;
                        background-color: white;
                        color: #333;
                        box-sizing: border-box;
                        line-height: 1.5;
                    " rows="2">Urgency needed as site is over 1p THRESHOLD</textarea>
                    <button id="copyCommentBtn" style="
                        margin-top: 10px;
                        background-color: #2196F3;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        font-size: 14px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: bold;
                        box-shadow: 0 2px 8px rgba(33, 150, 243, 0.4);
                        transition: all 0.3s;
                        width: 100%;
                    ">
                        📋 COPY TO CLIPBOARD
                    </button>
                    <div id="copySuccessMsg" style="
                        display: none;
                        color: #4caf50;
                        font-weight: bold;
                        margin-top: 8px;
                        font-size: 14px;
                    ">
                        ✓ Copied to clipboard!
                    </div>
                </div>
            </div>
            
            <button id="urgentAckBtn" style="
                background-color: #ff9800;
                color: white;
                border: none;
                padding: 15px 40px;
                font-size: 18px;
                border-radius: 8px;
                cursor: pointer;
                margin-top: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 4px 12px rgba(255, 152, 0, 0.4);
                transition: all 0.3s;
                width: 100%;
            ">
                ✓ I UNDERSTAND - PROCEED
            </button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Copy button functionality
        const copyBtn = document.getElementById('copyCommentBtn');
        const commentText = document.getElementById('urgentCommentText');
        const successMsg = document.getElementById('copySuccessMsg');

        copyBtn.onclick = () => {
            commentText.select();
            commentText.setSelectionRange(0, 99999);
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(commentText.value).then(() => {
                    showCopySuccess();
                }).catch(() => {
                    fallbackCopy();
                });
            } else {
                fallbackCopy();
            }
        };

        function fallbackCopy() {
            try {
                document.execCommand('copy');
                showCopySuccess();
            } catch (err) {
                alert('Failed to copy. Please manually copy the text.');
            }
        }

        function showCopySuccess() {
            copyBtn.style.backgroundColor = '#4caf50';
            copyBtn.innerHTML = '✓ COPIED!';
            copyBtn.style.animation = 'copySuccess 0.5s';
            
            successMsg.style.display = 'block';
            
            setTimeout(() => {
                copyBtn.style.backgroundColor = '#2196F3';
                copyBtn.innerHTML = '📋 COPY TO CLIPBOARD';
                successMsg.style.display = 'none';
            }, 2000);
        }

        copyBtn.onmouseover = () => {
            if (copyBtn.innerHTML.includes('COPY TO CLIPBOARD')) {
                copyBtn.style.backgroundColor = '#1976d2';
                copyBtn.style.transform = 'scale(1.02)';
            }
        };
        copyBtn.onmouseout = () => {
            if (copyBtn.innerHTML.includes('COPY TO CLIPBOARD')) {
                copyBtn.style.backgroundColor = '#2196F3';
                copyBtn.style.transform = 'scale(1)';
            }
        };

        const ackBtn = document.getElementById('urgentAckBtn');
        ackBtn.onmouseover = () => {
            ackBtn.style.backgroundColor = '#e68900';
            ackBtn.style.transform = 'scale(1.02)';
        };
        ackBtn.onmouseout = () => {
            ackBtn.style.backgroundColor = '#ff9800';
            ackBtn.style.transform = 'scale(1)';
        };
        
        ackBtn.onclick = () => {
            overlay.style.animation = 'fadeIn 0.2s reverse';
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.style.animation = 'fadeIn 0.2s reverse';
                setTimeout(() => overlay.remove(), 200);
            }
        };
    }

    // Extract site code from element
    function extractSiteCode(element) {
        if (!element) return null;

        const text = element.textContent || element.innerText || '';
        
        const patterns = [
            /\b([A-Z]{3,4}\d{1,2})\b/g,
            /Site[:\s]+([A-Z]{3,4}\d{1,2})/gi,
            /Location[:\s]+([A-Z]{3,4}\d{1,2})/gi,
            /\b(RDU[A-Z0-9]*)\b/gi,
            /\b(MCO[A-Z0-9]*)\b/gi,
            /\b(FTW[A-Z0-9]*)\b/gi,
            /\b(BFI[A-Z0-9]*)\b/gi,
            /\b(DCA[A-Z0-9]*)\b/gi
        ];

        for (let pattern of patterns) {
            const matches = [...text.matchAll(pattern)];
            for (let match of matches) {
                const siteCode = match[1].toUpperCase().trim();
                if (isUrgentSite(siteCode)) {
                    return siteCode;
                }
            }
        }

        if (element.dataset) {
            const attrs = ['site', 'siteCode', 'location', 'siteId'];
            for (let attr of attrs) {
                if (element.dataset[attr] && isUrgentSite(element.dataset[attr])) {
                    return element.dataset[attr].toUpperCase();
                }
            }
        }

        return null;
    }

    function isUnassigned(element) {
        const spans = element.querySelectorAll('span');
        for (let span of spans) {
            if (span.textContent.trim() === 'Unassigned') {
                return true;
            }
        }
        return false;
    }

    function checkWorkOrder(element) {
        if (!element || !element.querySelector) return;

        if (isUnassigned(element)) {
            const siteCode = extractSiteCode(element);
            
            if (siteCode && siteCode !== currentWorkOrderId) {
                currentWorkOrderId = siteCode;
                console.log('🚨 1P Threshold site detected:', siteCode);
                showUrgentPopup(siteCode);
            }
        }
    }

    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            for (let node of mutation.addedNodes) {
                if (node.nodeType === 1) {
                    checkWorkOrder(node);
                    
                    const unassignedElements = node.querySelectorAll('span');
                    for (let el of unassignedElements) {
                        if (el.textContent.trim() === 'Unassigned') {
                            let parent = el.closest('[class*="work"], [class*="order"], [class*="card"]') || el.parentElement;
                            checkWorkOrder(parent);
                        }
                    }
                }
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    document.addEventListener('click', (e) => {
        setTimeout(() => {
            let element = e.target;
            for (let i = 0; i < 6; i++) {
                if (element) {
                    checkWorkOrder(element);
                    element = element.parentElement;
                }
            }
        }, 300);
    }, true);

    console.log('✅ Amazon Relay 1P Threshold Alert script loaded successfully');
    console.log('📊 Monitoring threshold sites: STL5, YVR2, RDF2, TPA1, RDU*, MCO*, FTW*, BFI*, DCA*');
})()
