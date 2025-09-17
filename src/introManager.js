/**
 * @copyright Copyright (c) 2024 Val Jossic <val@framasoft.org>
 *
 * @author Val Jossic <val@framasoft.org>
 *
 * @license AGPL-3.0-or-later
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 */

import introJs from 'intro.js'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'
import { showError, showSuccess } from '@nextcloud/dialogs'
import Vue from 'vue'
import IntroTooltip from './components/IntroTooltip.vue'

const APPLICATION_ID = 'intros'

/**
 * Represents a manager for handling intro.js tours in a Nextcloud application.
 *
 * @property {introJs} intro - The intro.js instance.
 * @property {string} app - The name of the app the intro is running in.
 * @property {string} cookieKey - The key to store the user's choice to not show the intro again.
 * @property {boolean} firstRun - Whether the intro is running for the first time.
 * @property {Array} elementsToOpen - The elements that need to be opened before the intro can continue.
 * @property {Array} elementsToHover - The elements that need to be hovered before a step.
 * @property {element} lastHoveredElement - The element that was hovered on the previous step.
 * @property {Array} lazyElements - Array of elements that are gonna be queried right before arriving to their step.
 * @property {Array} vueIntrosData - The data to display in the Vue tooltip.
 * @property {object} introOptions - The options for the intro.
 * @property {MutationObserver} vueTooltipObserver - Tooltip obsever to mount the Vue tooltips.
 * @property {string} getConfigUrl - The URL to get the user's configuration.
 *
 */
export class IntroManager {

	constructor(app, intros) {
		this.intro = introJs()

		this.app = app
		this.cookieKey = `introjs-dontShowAgain-${app}` // Not actually a cookie, but a IConfig key
		// the cookie key name comes from the original cookie saved by introjs, which is not used here

		this.firstRun = true

		this.elementsToOpen = []
		this.elementsToHover = []
		this.lastHoveredElement = null
		this.lazyElements = []
		this.vueIntrosData = []
		this.introOptions = { ...intros }

		this.vueTooltipObserver = new MutationObserver((rec, obs) => { this.vueTooltipObserverCallback(rec, obs) })
		this.getConfigUrl = generateUrl(`/apps/${APPLICATION_ID}/getconf/${this.cookieKey}`)
		this.saveConfigUrl = generateUrl(`/apps/${APPLICATION_ID}/saveconf`)
	}

	/**
	 * Tries to run the intro and returns a boolean indicating whether the intro was started successfully.
	 *
	 * @param {boolean} computeOptions - Whether to compute intro options before starting the intro. Default is true.
	 * @return {Promise<boolean>} - A promise that resolves to a boolean indicating whether the intro was started successfully.
	 */
	async run(computeOptions = true) {
		const introIsStartable = await this.checkIntroStartable()
		if (!introIsStartable) return false

		if (computeOptions) this.computeIntroOptions()
		await this.startIntro()
		return true
	}

	/**
	 * Checks whether the intro can be started for the current app.
	 *
	 * @return {Promise<boolean>} A promise that resolves to a boolean indicating whether the intro can be started.
	 */
	async checkIntroStartable() {
		if (!(this.app in this.introOptions)) {
			console.debug(`\[${APPLICATION_ID}\]: app ${this.app} not found in options, terminating`)
			return false
		}

		if (document.querySelector('div.introjs-overlay')) {
			console.debug(`\[${APPLICATION_ID}\]: other intro is running, terminating ${this.app}`)
			return false
		}

		if (document.querySelector('#firstrunwizard') || document.querySelector('#terms_of_service_content')) {
			console.debug(`\[${APPLICATION_ID}\]: first run wizard or terms of service popup detected, terminating`)
			return false
		}

		console.debug(`\[${APPLICATION_ID}\]: found app ${this.app}, running intro`)
		return true
	}

	/**
	 * Starts the intro.js tutorial.
	 *
	 * @return {Promise<void>} A promise that resolves when the tutorial is started.
	 */
	async startIntro() {
		await this.intro
			.setOptions(this.introOptions[this.app])
			.setOptions({
				nextLabel: t(APPLICATION_ID, 'Next'),
				doneLabel: t(APPLICATION_ID, 'Done'),
				prevLabel: t(APPLICATION_ID, 'Previous'),
				isActive: true, // might have been set to false by the observer, we handle it manually
				exitOnOverlayClick: false,
				scrollTo: 'tooltip',
			})
			.onbeforechange(async (elem) => { await this.preProcessElement(elem) }) // check if an element has to be clicked before going to the next step
			.onafterchange(() => { this.triggerVueOnTooltipAvailable() }) // mount the Vue template when the tooltip is available
			.onexit(() => { this.handleIntroExit() }) // show a message when the intro is exited
			.start()
	}

	/**
	 * Stops the intro if it is currently active.
	 */
	stopIntro() {
		if (this.intro.isActive()) this.intro.exit()
	}

	/**
	 * Process the element before going to the next step, if needed. Opens a clickable element, or displays an element to hover, if need accordingly.
	 *
	 * @param {HTMLElement} introElement - The element the intro step is focusing.
	 * @return {Promise<void>} - a Promise that resolves once the processing is over.
	 */
	async preProcessElement(introElement) {
		const currentIntroStep = this.intro._currentStep
		// check for lazy elements
		// will change the element to query it right before going to it, real smooth
		const lazyElementEntry = this.lazyElements.find(e => e.stepIndex === currentIntroStep)
		if (lazyElementEntry) {
			this.intro._introItems[currentIntroStep].element = document.querySelector(lazyElementEntry.element) ?? this.intro._introItems[currentIntroStep].element
			this.intro._introItems[currentIntroStep].position = lazyElementEntry.position ?? 'bottom'
			introElement = document.querySelector(lazyElementEntry.element)
		}

		// hovering an element and resetting the previously hovered element
		const elementToHoverEntry = this.elementsToHover.find(e => document.querySelector(e) === introElement)
		if (this.lastHoveredElement) {
			this.lastHoveredElement.style.display = ''
			this.lastHoveredElement = null
		}
		if (elementToHoverEntry) { // not really hovering, rather just making it visible... because simulating hovers just doesn't exist :'(
			if (introElement) introElement.style.display = 'block'
			this.lastHoveredElement = introElement
		}

		// check if there is an element to open
		const elementToOpenEntry = this.elementsToOpen.find(e => e.stepIndex === currentIntroStep)

		return new Promise((resolve, reject) => { // returning a promise so onbeforechange will wait for it to resolve before proceeding
			if (!elementToOpenEntry) return resolve()
			const elementToClick = document.querySelector(elementToOpenEntry.clickableElement)
			const elementToFocus = document.querySelector(elementToOpenEntry.element)
			if (elementToFocus && elementToFocus.offsetParent) { // menu already opened (from previous step)
				this.intro._introItems[currentIntroStep].element = document.querySelector(elementToOpenEntry.element)
				this.intro.refresh()
				setTimeout(() => {
					elementToClick.click()
				}, 50)
				return resolve()
			}

			this.shineOnClick(elementToClick) // I'm too shiny
			setTimeout(() => {
				elementToClick.click()
			}, 100)

			// wait for the elements to appear after the click, and update the current step's element by querying the actual element to highlight
			setTimeout(() => {
				if (document.querySelector(elementToOpenEntry.element)) {
					this.intro._introItems[currentIntroStep].element = document.querySelector(elementToOpenEntry.element)
				} else {
					// show the tooltip in the center if the element to focus wasnt found
					this.intro._introItems[currentIntroStep].element = document.querySelector('div.introjsFloatingElement')
					this.intro._introItems[currentIntroStep].position = 'floating'
				}
				this.intro.refresh() // refresh to load the new config (will stay on the same step but with the new element :))
				return resolve()
			}, 400)
		})
	}

	/**
	 * Make an element 'shine' on clicking it. Displays a small expanding circle that disappears quickly on it to show where the click has occured.
	 *
	 * @param {Element} element the currently focused element
	 */
	shineOnClick(element) {
		const elementRect = element.getBoundingClientRect()
		const centerX = (elementRect.left + elementRect.right) / 2
		const centerY = (elementRect.bottom + elementRect.top) / 2
		const circle = document.createElement('div')
		circle.style.position = 'fixed'
		circle.style.top = `${centerY}px`
		circle.style.left = `${centerX}px`
		circle.classList.add('shine')

		document.querySelector('body').appendChild(circle)
		setTimeout(() => {
			circle.remove() // always clean up your mess
		}, 1000)
	}

	/**
	 * Callback function for the Vue tooltip observer. Mounts the Vue tooltip when the tooltip is available.
	 *
	 * @param {MutationRecord[]} rec - An array of mutation records.
	 * @param {MutationObserver} obs - The mutation observer instance.
	 */
	vueTooltipObserverCallback(rec, obs) {
		for (const record of rec) {
			for (const node of record.addedNodes) {
				if (!node.id === 'intro-vue') return

				this.mountVueTooltip()
				obs.disconnect()
			}
		}
	}

	/**
	 * Triggers Vue mount on the tooltip when it's loaded.
	 */
	triggerVueOnTooltipAvailable() {
		const currentIntroStep = this.intro._currentStep
		if (currentIntroStep === 0 && this.firstRun) { // mount the tooltip immediately if it's the first tooltip of the first run (the observer doesn't detect it in time)
			this.mountVueTooltip()
			this.firstRun = false
			return
		}
		this.vueTooltipObserver.observe(document.querySelector('div.introjs-tooltiptext'), { subtree: false, childList: true })
	}

	/**
	 * Mounts the Vue tooltip component with the current intro step data.
	 */
	mountVueTooltip() {
		const currentIntroStep = this.intro._currentStep
		const currentIntroData = this.vueIntrosData[currentIntroStep]
		const VueSettings = Vue.extend(IntroTooltip)
		Vue.mixin({ methods: { t, n } })
		const vueElement = new VueSettings()
		for (const property in currentIntroData) {
			Vue.set(vueElement.properties, property, currentIntroData[property])
		}
		Vue.set(vueElement.properties, 'introManager', this)
		Vue.set(vueElement.properties, 'app', { appId: this.app, appName: currentIntroData.appName })
		vueElement.$mount('#intro-vue')
	}

	/**
	 * Shows a message confirming the user's preferences have been saved.
	 * If the user exits before the last step, shows nothing and saves to not show the intro again.
	 */
	async handleIntroExit() {
		this.intro.setOption('isActive', false) // annoying property won't deactivate itself unless the actual introjs cookie is set
		// setting it to false here since this function is called on intro exit

		const currentIntroStep = this.intro._currentStep
		const totalNumberOfSteps = this.intro._introItems.length

		if (currentIntroStep !== totalNumberOfSteps - 1) { // if exited before the last step save to not show again
			const saveConfigParams = {
				key: `introjs-dontShowAgain-${this.app}`,
				value: 'true',
			}
			await axios.put(this.saveConfigUrl, saveConfigParams)
			return
		}

		try {
			const res = await axios.get(this.getConfigUrl)
			const savedValue = res.data.ocs.data.value
			let message = t(APPLICATION_ID, 'Saved. This tutorial will play again next time.')
			if (savedValue === 'true') { // true means "dont show again"
				message = t(APPLICATION_ID, "Saved. This tutorial won't be shown again.")
			}
			showSuccess(message)
		} catch (err) {
			showError(err)
		}
	}

	/**
	 * Computes the intro options for the current app.
	 * This method prepares the intro options by processing the steps and updating the necessary elements.
	 * It changes the intro options to be compatible with the intro.js library, and stores the elements that need to be opened and the data to put in the vue tooltips.
	 */
	computeIntroOptions() {
		for (const [stepIndex, step] of this.introOptions[this.app].steps.entries()) { // looping over the intro steps of the current app
			if (step.hover) {
				this.elementsToHover.push(step.element)
			}

			if (step.element === '') {
				delete step.element
			}

			if ('open' in step) {
				// If there is something to open, store the corresponding element and the element that needs to be clicked in the elementsToOpen array
				const element = step.element
				const clickableElement = step.open
				this.elementsToOpen.push({
					stepIndex,
					element, // no query selector: this element might no be in the DOM yet! //? how about a better name ?
					clickableElement,
				})

				step.element = document.querySelector(clickableElement) // introjs will focus on the clickable element first and then be updated to the element

			} else if ('element' in step) {
				// storing the element's query in the lazyElements array so we can lazily load it right before we get to that step
				this.lazyElements.push({ stepIndex, element: step.element, position: step.position })
			}

			// store the data for the tooltip so it can be passed to the vue template
			this.vueIntrosData.push({
				paragraphs: step.paragraphs,
				img: step.img,
				button: false, // false by default, might be changed for the last step
				links: step.links ? step.links.map((link) => ({ linkId: link, linkName: this.introOptions[link] ? this.introOptions[link].name : link })) : undefined, // also passing links' app's name as translated in json file (name field in json)
				choices: step.choices,
			})

			// div on which the vue template will be mounted
			step.intro = "<div id='intro-vue'></div>"
		}
		const stepLength = this.introOptions[this.app].steps.length
		this.vueIntrosData[stepLength - 1].button = true // button 'launch again?' on last tooltip
	}

}

/**
 * Represents a manager for handling intro.js tours in a Nextcloud application's aside.
 * @augments IntroManager
 *
 * @property {boolean} introInTab - Whether the intro is in a tab.
 * @property {string} tabName - The name of the tab.
 * @property {boolean} computeOptions - Whether to compute intro options before starting the intro.
 * @property {MutationObserver} asideObs - The observer for the aside element.
 * @property {MutationObserver} mainContentObs - The observer for the main content.
 */
export class AsideIntroManager extends IntroManager {

	constructor(app, intros, tab = false) {
		super(app, intros)

		this.introInTab = tab
		this.tabName = ''
		if (this.introInTab) {
			this.tabName = app.match('^.*-aside-(.*)$')[1]
		}
		this.computeOptions = true

		this.asideObs = new MutationObserver((rec, obs) => { this.asideObserverCallback(rec, obs) })
		this.mainContentObs = new MutationObserver((rec, obs) => { this.mainContentObserverCallback(rec, obs) })
	}

	/**
	 * Launches the necessary observers and runs the intro manager.
	 */
	runAside() {
		if (document.querySelector('aside')) {
			this.startAsideObserver()

			setTimeout(() => {
				if (this.introInTab) {
					if (this.checkAsideTabActive(`section#${this.tabName}`, 'app-sidebar__tab--active')) { // sorry about that nesting
						this.launchAsideIntro()
					}
				} else {
					this.launchAsideIntro()
				}
			}, 1000) //! hardcoded value :(
		}

		this.mainContentObs.observe(document.querySelector('div#content-vue'), { subtree: false, childList: true })
		// observe the main content to detect aside opening/closing
	}

	/**
	 * Tries to launch the aside intro.
	 *
	 * @return {Promise<void>} A promise that resolves when the intro is launched.
	 */
	async launchAsideIntro() {
		this.firstRun = true
		const introStarted = await super.run(this.computeOptions) // the parent's class will check if its startable
		this.computeOptions = !introStarted // if it hasn't started we want to compute the options next time we try to start it, otherwise we don't
	}

	/**
	 * Stops the aside intro if it is currently active.
	 */
	stopAsideIntro() {
		if (this.intro.isActive()) this.intro.exit()
	}

	/**
	 * Starts the observer for the aside element, if the intro is in a tab.
	 */
	startAsideObserver() {
		if (!this.introInTab) return
		this.asideObs.observe(document.querySelector('aside'), { subtree: true, attributeFilter: ['class'] })
		// observe the aside to detect when the tab is active
	}

	/**
	 * Callback function for the aside observer. Launches/stops the intro based on the tab's active state.
	 *
	 * @param {MutationRecord[]} rec - An array of mutation records.
	 * @param {MutationObserver} obs - The mutation observer instance.
	 */
	asideObserverCallback(rec, obs) {
		for (const record of rec) {
			if (!this.introInTab) return // just in case
			if (record.target.id !== this.tabName) continue

			if (!record.target.classList.contains('app-sidebar__tab--active')) { // I'm not sure whether it's fine that these are hardcoded
				this.stopAsideIntro()
				continue
			}
			if (this.checkAsideTabActive(`section#${this.tabName}`, 'app-sidebar__tab--active')) {
				this.launchAsideIntro()
			}

		}
	}

	/**
	 * Callback function for the main content observer. Detects whether and aside is added or removed and launches/stops the intro accordingly.
	 *
	 * @param {MutationRecord[]} rec - An array of mutation records.
	 * @param {MutationObserver} obs - The mutation observer instance.
	 */
	mainContentObserverCallback(rec, obs) {
		for (const record of rec) {
			for (const node of record.addedNodes) {
				if (!this.checkAsideNode(node)) return

				this.startAsideObserver()
				setTimeout(() => {
					if (this.introInTab) {
						if (this.checkAsideTabActive(`section#${this.tabName}`, 'app-sidebar__tab--active')) { // if it's active right when opened the observer won't catch it
							this.launchAsideIntro()
						}
					} else {
						this.launchAsideIntro()
					}
				}, 1000) //! hardcoded value :(

			}
			for (const node of record.removedNodes) { // stop the intro if the aside is closed
				if (!this.checkAsideNode(node)) return
				this.asideObs.disconnect()
				this.stopAsideIntro()
			}
		}
	}

	/**
	 * Checks if the given node is an aside node with the class "app-sidebar".
	 *
	 * @param {HTMLElement} node - The node to check.
	 * @return {boolean} - Returns true if the node is an aside node with the class "app-sidebar", otherwise false.
	 */
	checkAsideNode(node) {
		if (!node || !node.classList) return false
		if (!node.classList.contains('app-sidebar')) return false
		return true
	}

	/**
	 * Checks if the aside tab is active.
	 *
	 * @param {string} asideTabSelector - The selector for the aside tab.
	 * @param {string} asideClass - The activity class name to check for.
	 * @return {boolean} Returns true if the aside tab is active, otherwise false.
	 */
	checkAsideTabActive(asideTabSelector, asideClass) {
		if (!document.querySelector(asideTabSelector)) return false
		if (document.querySelector(asideTabSelector).classList.contains(asideClass)) return true
		return false
	}

}
