// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Notificate for Urgency within Site and Reason
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
        urgentSites: ['STL5', 'YVR2', 'RDF2', 'TPA1'],
        urgentPrefixes: ['RDU', 'MCO', 'FTW', 'BFI', 'DCA'],
        checkInterval: 500,
        maxRetries: 20,
        debug: true // Enable detailed logging
    };

    // ============================================
    // LOGGING UTILITY
    // ============================================
    function log(message, data = null) {
        if (CONFIG.debug) {
            console.log(`[🚨 Urgent Alert] ${message}`, data || '');
        }
    }

    // ============================================
    // IMPROVED ELEMENT FINDERS
    // ============================================

    /**
     * Find Last Yard Location using multiple strategies
     */
    function getLastYardLocation() {
        log('Searching for Last Yard Location...');

        // Strategy 1: Look for text "Last Yard Location" and get next element
        const labels = Array.from(document.querySelectorAll('p, span, div, label'));
        const locationLabel = labels.find(el =>
            el.textContent.trim() === 'Last Yard Location'
        );

        if (locationLabel) {
            // Try to find the value in the next sibling or parent's next sibling
            let valueElement = locationLabel.nextElementSibling;
            if (!valueElement) {
                valueElement = locationLabel.parentElement?.nextElementSibling;
            }
            if (!valueElement) {
                // Try finding within same parent
                const parent = locationLabel.parentElement;
                const allP = parent?.querySelectorAll('p');
                if (allP && allP.length > 1) {
                    valueElement = allP[1]; // Second p tag might be the value
                }
            }

            if (valueElement) {
                const text = valueElement.textContent.trim();
                log('Found location via label strategy:', text);
                return text;
            }
        }

        // Strategy 2: Look for DCA1 pattern directly (site code pattern)
        const allText = Array.from(document.querySelectorAll('p, span, div'));
        const locationElement = allText.find(el => {
            const text = el.textContent.trim();
            return /^[A-Z]{3}\d+\s*-\s*[A-Z]{2}\d+/.test(text); // Matches "DCA1 - DD138"
        });

        if (locationElement) {
            const text = locationElement.textContent.trim();
            log('Found location via pattern matching:', text);
            return text;
        }

        // Strategy 3: Look in Service Overview section specifically
        const serviceOverview = Array.from(document.querySelectorAll('div')).find(el =>
            el.textContent.includes('Last Yard Location')
        );

        if (serviceOverview) {
            const paragraphs = serviceOverview.querySelectorAll('p');
            for (let p of paragraphs) {
                const text = p.textContent.trim();
                if (/^[A-Z]{3}\d+/.test(text)) {
                    log('Found location in Service Overview:', text);
                    return text;
                }
            }
        }

        log('❌ Could not find Last Yard Location');
        return null;
    }

    /**
     * Check if current work order is unassigned
     */
    function isUnassignedWorkOrder() {
        const allElements = document.querySelectorAll('span, p, div');
        for (let el of allElements) {
            if (el.textContent.trim() === 'Unassigned') {
                log('✅ Work order is unassigned');
                return true;
            }
        }
        log('Work order is NOT unassigned');
        return false;
    }

    // ============================================
    // SITE DETECTION
    // ============================================

    function extractSiteCode(locationText) {
        if (!locationText) return null;
        const match = locationText.trim().match(/^([A-Z0-9]+)/);
        const code = match ? match[1] : null;
        log('Extracted site code:', code);
        return code;
    }

    function isUrgentSite(siteCode) {
        if (!siteCode) return false;

        // Check exact matches
        if (CONFIG.urgentSites.includes(siteCode)) {
            log(`🚨 URGENT: Exact match found - ${siteCode}`);
            return true;
        }

        // Check prefix matches
        const matchedPrefix = CONFIG.urgentPrefixes.find(prefix =>
            siteCode.startsWith(prefix)
        );

        if (matchedPrefix) {
            log(`🚨 URGENT: Prefix match found - ${siteCode} starts with ${matchedPrefix}`);
            return true;
        }

        log(`✅ Not urgent: ${siteCode}`);
        return false;
    }

    // ============================================
    // POPUP MODAL
    // ============================================

    function showUrgentPopup(siteCode) {
        if (document.getElementById('urgent-site-modal')) {
            log('Popup already displayed');
            return;
        }

        log(`🚨 Showing popup for ${siteCode}`);

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
                ">This site requires immediate attention. Make sure to comment the need of urgency.</p>
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

        document.getElementById('acknowledge-btn').addEventListener('click', () => {
            overlay.style.animation = 'fadeIn 0.2s ease-out reverse';
            setTimeout(() => overlay.remove(), 200);
        });
    }

    // ============================================
    // MAIN DETECTION LOGIC
    // ============================================

    let lastCheckedLocation = null;
    let checkAttempts = 0;
    let hasTriggered = false;

    function checkForUrgentSite() {
        log(`--- Check attempt ${checkAttempts + 1} ---`);

        // Don't trigger multiple times for same page
        if (hasTriggered) {
            log('Already triggered for this work order');
            return;
        }

        // Check if unassigned
        if (!isUnassignedWorkOrder()) {
            log('Not an unassigned work order, skipping');
            return;
        }

        // Get location
        const locationText = getLastYardLocation();
        if (!locationText) {
            checkAttempts++;
            if (checkAttempts < CONFIG.maxRetries) {
                log(`Retrying... (${checkAttempts}/${CONFIG.maxRetries})`);
                setTimeout(checkForUrgentSite, CONFIG.checkInterval);
            } else {
                log('❌ Max retries reached, giving up');
            }
            return;
        }

        // Reset attempts
        checkAttempts = 0;

        // Avoid duplicate checks
        if (locationText === lastCheckedLocation) {
            log('Same location as last check, skipping');
            return;
        }
        lastCheckedLocation = locationText;

        // Extract and check site code
        const siteCode = extractSiteCode(locationText);

        if (isUrgentSite(siteCode)) {
            log(`🚨🚨🚨 URGENT SITE DETECTED: ${siteCode} 🚨🚨🚨`);
            hasTriggered = true;

            // Show popup
            setTimeout(() => showUrgentPopup(siteCode), 500);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        log('=== Script Initialized ===');
        log('Urgent Sites:', CONFIG.urgentSites);
        log('Urgent Prefixes:', CONFIG.urgentPrefixes);

        // Initial check
        setTimeout(checkForUrgentSite, 1000);

        // Watch for DOM changes
        const observer = new MutationObserver((mutations) => {
            // Reset trigger flag when significant changes occur
            const significantChange = mutations.some(m =>
                m.addedNodes.length > 5 || m.removedNodes.length > 5
            );

            if (significantChange) {
                log('Significant DOM change detected');
                hasTriggered = false;
                lastCheckedLocation = null;
                checkAttempts = 0;
            }

            checkForUrgentSite();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        log('MutationObserver active');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
