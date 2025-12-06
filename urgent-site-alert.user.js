// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.0.0                                                                                                                                         #UPDATE THIS PART, IT WILL INITIATE THE UPDATE FOR OTHERS WHEN THEY PRESS THE AAP BUTTON   
// @description  Notificate for Urgency withing Site and Reason 
// @author       monimag
// @match        https://aap-na.corp.amazon.com/*
// @icon         https://www.google.com/s2/favicons?domain=amazon.com
// @updateURL    https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @downloadURL  https://raw.githubusercontent.com/monimag1262/URGENCY-NEEDED-Tamper-Monkey-Script-/main/urgent-site-alert.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    const CONFIG = {
        // Exact match sites
        urgentSites: ['STL5', 'YVR2', 'RDF2', 'TPA1'],

        // Prefix match sites
        urgentPrefixes: ['RDU', 'MCO', 'FTW', 'BFI', 'DCA'],

        // Comment to auto-fill
        urgentComment: 'Work Order is Urgent Due to Site being over 1P Threshold',

        // Selectors
        selectors: {
            unassignedSpan: 'span:contains("Unassigned")',
            lastYardLocation: 'p.css-86vfqe',
            commentTextarea: 'textarea.css-hg5e51[placeholder="Enter Comments Here"]',
            workOrderContainer: 'td.css-18tzy6q'
        },

        // Timing
        checkInterval: 500, // ms between checks
        maxRetries: 10 // Maximum attempts to find elements
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Extract site code from location text
     * Example: "RDU1 - PS552 (ParkingSlip)" -> "RDU1"
     */
    function extractSiteCode(locationText) {
        if (!locationText) return null;

        // Extract the site code (everything before the first space or dash)
        const match = locationText.trim().match(/^([A-Z0-9]+)/);
        return match ? match[1] : null;
    }

    /**
     * Check if site code is urgent
     */
    function isUrgentSite(siteCode) {
        if (!siteCode) return false;

        // Check exact matches
        if (CONFIG.urgentSites.includes(siteCode)) {
            return true;
        }

        // Check prefix matches
        return CONFIG.urgentPrefixes.some(prefix => siteCode.startsWith(prefix));
    }

    /**
     * Check if current work order is unassigned
     */
    function isUnassignedWorkOrder() {
        const unassignedElements = document.querySelectorAll('span');
        for (let span of unassignedElements) {
            if (span.textContent.trim() === 'Unassigned') {
                return true;
            }
        }
        return false;
    }

    /**
     * Get Last Yard Location text
     */
    function getLastYardLocation() {
        const locationElement = document.querySelector(CONFIG.selectors.lastYardLocation);
        return locationElement ? locationElement.textContent.trim() : null;
    }

    /**
     * Auto-fill comment textarea
     */
    function fillComment() {
        const textarea = document.querySelector(CONFIG.selectors.commentTextarea);

        if (textarea) {
            // Check if comment already exists
            if (textarea.value.includes(CONFIG.urgentComment)) {
                console.log('[Urgent Alert] Comment already filled');
                return true;
            }

            // Fill the comment
            textarea.value = CONFIG.urgentComment;

            // Trigger input event to ensure React/Vue detects the change
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));

            console.log('[Urgent Alert] Comment auto-filled');
            return true;
        }

        return false;
    }

    // ============================================
    // POPUP MODAL
    // ============================================

    /**
     * Create and show urgent site popup
     */
    function showUrgentPopup(siteCode) {
        // Prevent duplicate popups
        if (document.getElementById('urgent-site-modal')) {
            return;
        }

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.id = 'urgent-site-modal';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            animation: fadeIn 0.2s ease-in;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 90%;
            text-align: center;
            animation: slideIn 0.3s ease-out;
        `;

        modal.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulse 2s infinite;
                ">
                    <span style="font-size: 48px; color: white;">⚠️</span>
                </div>
                <h2 style="
                    margin: 0 0 15px 0;
                    color: #2c3e50;
                    font-size: 24px;
                    font-weight: 600;
                ">URGENT WORK ORDER</h2>
                <p style="
                    margin: 0 0 10px 0;
                    color: #e74c3c;
                    font-size: 18px;
                    font-weight: 600;
                ">${siteCode} - OVER 1P THRESHOLD</p>
                <p style="
                    margin: 0;
                    color: #555;
                    font-size: 14px;
                    line-height: 1.6;
                ">This site requires immediate attention. The comment section has been auto-filled with urgency notification.</p>
            </div>
            <button id="acknowledge-btn" style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 14px 40px;
                font-size: 16px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)';">
                I Acknowledge and Understand
            </button>
        `;

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
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
        `;
        document.head.appendChild(style);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Handle acknowledgment
        document.getElementById('acknowledge-btn').addEventListener('click', () => {
            overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
            setTimeout(() => {
                overlay.remove();
            }, 200);
        });

        console.log(`[Urgent Alert] Popup displayed for site: ${siteCode}`);
    }

    // ============================================
    // MAIN DETECTION LOGIC
    // ============================================

    let lastCheckedLocation = null;
    let checkAttempts = 0;

    function checkForUrgentSite() {
        // Check if this is an unassigned work order
        if (!isUnassignedWorkOrder()) {
            return;
        }

        // Get location
        const locationText = getLastYardLocation();
        if (!locationText) {
            checkAttempts++;
            if (checkAttempts < CONFIG.maxRetries) {
                setTimeout(checkForUrgentSite, CONFIG.checkInterval);
            }
            return;
        }

        // Reset attempts counter
        checkAttempts = 0;

        // Avoid duplicate checks
        if (locationText === lastCheckedLocation) {
            return;
        }
        lastCheckedLocation = locationText;

        // Extract and check site code
        const siteCode = extractSiteCode(locationText);
        console.log(`[Urgent Alert] Checking site: ${siteCode} from "${locationText}"`);

        if (isUrgentSite(siteCode)) {
            console.log(`[Urgent Alert] URGENT SITE DETECTED: ${siteCode}`);

            // Fill comment first
            fillComment();

            // Show popup
            showUrgentPopup(siteCode);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        console.log('[Urgent Alert] Script initialized');

        // Initial check
        setTimeout(checkForUrgentSite, 1000);

        // Watch for DOM changes (when work orders are opened)
        const observer = new MutationObserver((mutations) => {
            // Check if relevant elements changed
            for (let mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    checkForUrgentSite();
                    break;
                }
            }
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[Urgent Alert] MutationObserver active');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
