// ==UserScript==
// @name         Amazon Relay Urgent Site Alert
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Notificate for Urgency within Site and Reason with Auto-Comment System
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
        urgentComment: 'Work Order is Urgent Due to Site being over 1P Threshold',
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
    // AUTO-COMMENT SYSTEM CLASS
    // ============================================
    class AutoCommentSystem {
        constructor() {
            this.textareaSelector = '#my-input';
            this.svgSelector = 'svg[width="24"][height="20"]';
            this.maxWaitTime = 5000;
            this.checkInterval = 100;
            this.pendingComment = null;
        }

        init() {
            this.attachSVGListener();
            log('✅ Auto-comment system initialized');
        }

        attachSVGListener() {
            document.addEventListener('click', (event) => {
                const svg = event.target.closest(this.svgSelector);

                if (svg) {
                    log('🖱️ Comment icon clicked');
                    this.handleCommentIconClick();
                }
            }, true);
        }

        handleCommentIconClick() {
            if (this.pendingComment) {
                this.waitForTextareaAndInsert(this.pendingComment);
            }
        }

        setPendingComment(commentText) {
            if (!commentText || typeof commentText !== 'string') {
                log('❌ Invalid comment text');
                return false;
            }

            this.pendingComment = commentText.trim();
            log('📝 Comment queued:', this.pendingComment);
            return true;
        }

        async waitForTextareaAndInsert(commentText) {
            try {
                const textarea = await this.waitForElement(this.textareaSelector);

                if (textarea) {
                    await this.delay(200);

                    const result = this.insertComment(textarea, commentText);

                    if (result.success) {
                        log('✅', result.message);
                        this.showNotification('Comment inserted successfully', 'success');
                        this.pendingComment = null;
                    } else {
                        log('❌', result.message);
                        this.showNotification(result.message, 'error');
                    }
                } else {
                    log('❌ Textarea did not appear within timeout');
                    this.showNotification('Comment box not found', 'error');
                }
            } catch (error) {
                log('❌ Error in waitForTextareaAndInsert:', error);
                this.showNotification('Failed to insert comment', 'error');
            }
        }

        waitForElement(selector) {
            return new Promise((resolve) => {
                const existingElement = document.querySelector(selector);
                if (existingElement) {
                    resolve(existingElement);
                    return;
                }

                let elapsedTime = 0;
                const interval = setInterval(() => {
                    const element = document.querySelector(selector);

                    if (element) {
                        clearInterval(interval);
                        resolve(element);
                    } else if (elapsedTime >= this.maxWaitTime) {
                        clearInterval(interval);
                        resolve(null);
                    }

                    elapsedTime += this.checkInterval;
                }, this.checkInterval);
            });
        }

        insertComment(textarea, commentText) {
            try {
                if (!textarea) {
                    return {
                        success: false,
                        message: 'Textarea element not provided'
                    };
                }

                textarea.value = commentText;
                this.triggerInputEvents(textarea);
                textarea.focus();

                return {
                    success: true,
                    message: 'Comment inserted successfully'
                };

            } catch (error) {
                log('Error inserting comment:', error);
                return {
                    success: false,
                    message: `Error: ${error.message}`
                };
            }
        }

        triggerInputEvents(element) {
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(inputEvent);

            const changeEvent = new Event('change', {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(changeEvent);

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype,
                'value'
            ).set;

            if (nativeInputValueSetter) {
                nativeInputValueSetter.call(element, element.value);
                element.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        showNotification(message, type = 'success') {
            const existing = document.querySelector('.auto-comment-notification');
            if (existing) existing.remove();

            const notification = document.createElement('div');
            notification.className = 'auto-comment-notification';
            notification.textContent = message;

            const styles = {
                position: 'fixed',
                top: '20px',
                right: '20px',
                padding: '16px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                zIndex: '10000',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                animation: 'slideIn 0.3s ease-out',
                backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
                color: '#ffffff'
            };

            Object.assign(notification.style, styles);

            if (!document.querySelector('#auto-comment-styles')) {
                const styleSheet = document.createElement('style');
                styleSheet.id = 'auto-comment-styles';
                styleSheet.textContent = `
                    @keyframes slideIn {
                        from {
                            transform: translateX(400px);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(styleSheet);
            }

            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        async insertCommentNow(commentText) {
            if (!commentText || typeof commentText !== 'string') {
                log('❌ Invalid comment text');
                this.showNotification('Invalid comment text', 'error');
                return;
            }

            const textarea = document.querySelector(this.textareaSelector);

            if (textarea) {
                const result = this.insertComment(textarea, commentText);

                if (result.success) {
                    log('✅', result.message);
                    this.showNotification('Comment inserted successfully', 'success');
                } else {
                    log('❌', result.message);
                    this.showNotification(result.message, 'error');
                }
            } else {
                log('📝 Comment box not open. Queuing for next icon click.');
                this.setPendingComment(commentText);
            }
        }
    }

    // Initialize auto-comment system
    const autoCommentSystem = new AutoCommentSystem();

    // ============================================
    // IMPROVED ELEMENT FINDERS
    // ============================================

    function getLastYardLocation() {
        log('Searching for Last Yard Location...');

        const labels = Array.from(document.querySelectorAll('p, span, div, label'));
        const locationLabel = labels.find(el =>
            el.textContent.trim() === 'Last Yard Location'
        );

        if (locationLabel) {
            let valueElement = locationLabel.nextElementSibling;
            if (!valueElement) {
                valueElement = locationLabel.parentElement?.nextElementSibling;
            }
            if (!valueElement) {
                const parent = locationLabel.parentElement;
                const allP = parent?.querySelectorAll('p');
                if (allP && allP.length > 1) {
                    valueElement = allP[1];
                }
            }

            if (valueElement) {
                const text = valueElement.textContent.trim();
                log('Found location via label strategy:', text);
                return text;
            }
        }

        const allText = Array.from(document.querySelectorAll('p, span, div'));
        const locationElement = allText.find(el => {
            const text = el.textContent.trim();
            return /^[A-Z]{3}\d+\s*-\s*[A-Z]{2}\d+/.test(text);
        });

        if (locationElement) {
            const text = locationElement.textContent.trim();
            log('Found location via pattern matching:', text);
            return text;
        }

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

    function findCommentTextarea() {
        log('Searching for comment textarea...');

        let textarea = document.querySelector('#my-input');
        if (textarea) {
            log('✅ Found textarea by ID');
            return textarea;
        }

        textarea = document.querySelector('textarea[placeholder*="Enter Comments"]');
        if (textarea) {
            log('✅ Found textarea by placeholder');
            return textarea;
        }

        textarea = document.querySelector('textarea[aria-label*="comment" i]');
        if (textarea) {
            log('✅ Found textarea by aria-label');
            return textarea;
        }

        const conversationSection = document.querySelector('[class*="conversation" i], [class*="comment" i]');
        if (conversationSection) {
            textarea = conversationSection.querySelector('textarea');
            if (textarea) {
                log('✅ Found textarea in conversation section');
                return textarea;
            }
        }

        const textareas = Array.from(document.querySelectorAll('textarea'));
        textarea = textareas.find(ta => {
            const rect = ta.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
        });

        if (textarea) {
            log('✅ Found visible textarea');
            return textarea;
        }

        log('❌ Could not find comment textarea');
        return null;
    }

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

        if (CONFIG.urgentSites.includes(siteCode)) {
            log(`🚨 URGENT: Exact match found - ${siteCode}`);
            return true;
        }

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
    // COMMENT AUTO-FILL (Enhanced)
    // ============================================

    function fillComment() {
        const textarea = findCommentTextarea();

        if (!textarea) {
            log('❌ Textarea not found, queuing comment for SVG click');
            autoCommentSystem.setPendingComment(CONFIG.urgentComment);
            return false;
        }

        if (textarea.value.includes(CONFIG.urgentComment)) {
            log('Comment already filled');
            return true;
        }

        textarea.value = CONFIG.urgentComment;

        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.dispatchEvent(new Event('blur', { bubbles: true }));

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype,
            'value'
        ).set;
        nativeInputValueSetter.call(textarea, CONFIG.urgentComment);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        log('✅ Comment auto-filled successfully');
        return true;
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
                ">This site requires immediate attention. The comment will be auto-filled when you open the comment section.</p>
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

        if (hasTriggered) {
            log('Already triggered for this work order');
            return;
        }

        if (!isUnassignedWorkOrder()) {
            log('Not an unassigned work order, skipping');
            return;
        }

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

        checkAttempts = 0;

        if (locationText === lastCheckedLocation) {
            log('Same location as last check, skipping');
            return;
        }
        lastCheckedLocation = locationText;

        const siteCode = extractSiteCode(locationText);

        if (isUrgentSite(siteCode)) {
            log(`🚨🚨🚨 URGENT SITE DETECTED: ${siteCode} 🚨🚨🚨`);
            hasTriggered = true;

            // Try to fill comment immediately
            setTimeout(() => {
                const filled = fillComment();
                if (!filled) {
                    log('📝 Comment queued - will auto-fill when comment icon is clicked');
                }
            }, 500);

            // Show popup
            setTimeout(() => showUrgentPopup(siteCode), 800);
        }
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    function init() {
        log('=== Script Initialized ===');
        log('Urgent Sites:', CONFIG.urgentSites);
        log('Urgent Prefixes:', CONFIG.urgentPrefixes);

        // Initialize auto-comment system
        autoCommentSystem.init();

        // Initial check
        setTimeout(checkForUrgentSite, 1000);

        // Watch for DOM changes
        const observer = new MutationObserver((mutations) => {
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
