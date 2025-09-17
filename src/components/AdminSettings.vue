<template>
	<div id="introjs_settings">
		<NcSettingsSection :name="t('intros', 'Intros')"
			:description="t('intros', 'You can choose to enable/disable the tutorial for each app. Check the apps for which you want to see the tutorial and click save, or use the enable/disable all buttons.')">
			<template v-if="loading">
				<NcLoadingIcon />
			</template>
			<template v-else-if="error">
				<p>{{ error }}</p>
			</template>
			<template v-else>
				<template v-for="app in appsList">
					<template v-if="!app.appId.includes('aside') && appIsInstalled(app)">
						<div :key="app.appId" class="check-apps">
							<NcCheckboxRadioSwitch :checked.sync="checkedApps" :value="app.appId" name="checkedApps">
								{{ app.appName.charAt(0).toUpperCase() + app.appName.slice(1) }}
							</NcCheckboxRadioSwitch>
							<div class="link-apps-wrapper">
								<NcButton type="tertiary" @click="onLinkClick(app.appId)">
									{{ t('intros', 'Go to tutorial') }}
								</NcButton>
							</div>
						</div>
					</template>
				</template>
				<div class="save-buttons-wrapper">
					<NcButton aria-label="Save" type="primary" @click="onSave">
						{{ t('intros', 'Save') }}
					</NcButton>
					<NcButton aria-label="Reactiveall" type="secondary" @click="onEnableAll">
						{{ t('intros', 'Enable all tutorials') }}
					</NcButton>
					<NcButton aria-label="Deactivateall" type="secondary" @click="onDisableAll">
						{{ t('intros', 'Disable all tutorials') }}
					</NcButton>
				</div>
			</template>
		</NcSettingsSection>
	</div>
</template>

<script>
import NcSettingsSection from '@nextcloud/vue/dist/Components/NcSettingsSection.js'
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'
import NcLoadingIcon from '@nextcloud/vue/dist/Components/NcLoadingIcon.js'

import { showSuccess, showError } from '@nextcloud/dialogs'
import axios from '@nextcloud/axios'
import { generateUrl } from '@nextcloud/router'

import { getCurrentLanguageIntro } from '../utils.js'

export default {
	name: 'AdminSettings',

	components: {
		NcSettingsSection,
		NcCheckboxRadioSwitch,
		NcButton,
		NcLoadingIcon,
	},

	data() {
		return {
			loading: true,
			error: false,
			checkedApps: [],
			installedApps: [],
			intros: null,
		}
	},

	computed: {
		appsList() {
			return this.getIntrosAppNames()
		},

		saveConfigsUrl() {
			return generateUrl('/apps/intros/saveconfs')
		},

		getConfigsUrl() {
			return generateUrl('/apps/intros/getconfs')
		},
	},

	async mounted() {
		this.intros = await getCurrentLanguageIntro()
		try {
			this.installedApps = (await axios.get(generateUrl('/apps/intros/apps'))).data.ocs.data.apps
			const res = await axios.get(this.getConfigsUrl)
			const appsInConfig = [] // list of apps that have an entry with a value in user's config
			for (const value in res.data.ocs.data.values) {
				if (value.match('introjs-dontShowAgain-(.*)')) {
					const app = value.match('introjs-dontShowAgain-(.*)')[1]
					appsInConfig.push(app)
					if (res.data.ocs.data.values[value] === 'false') this.checkedApps.push(app)
				}
			}
			for (const index in this.appsList) {
				if (!(appsInConfig.includes(this.appsList[index].appId))) {
					this.checkedApps.push(this.appsList[index].appId)
				} // adding the apps that don't have a value in user's config yet, but exist and have an intro
			}
			this.loading = false
		} catch (err) {
			this.error = err
			this.loading = false
		}
	},

	methods: {
		/**
		 * Gets the name of the apps that have an intro, and formats it into {appId: Id, appName: name}
		 *
		 * @return {object} containing ids and names of enabled apps that have intros.
		 */
		getIntrosAppNames() {
			return Object.entries(this.intros).map((appEntry) => ({ appId: appEntry[0], appName: appEntry[1].name ?? '' })) // also fetching appName that might have been translated in intros.json
		},

		/**
		 * Handling clicking of the save button. Goes through the configuration of each app and saves the correct value based on whether they're checked or not on the page.
		 */
		async onSave() {
			const saveConfigParams = { appConfigs: {} }
			this.appsList.forEach((app) => {
				if (app.appId.includes('aside')) return // asides will be taken care of later

				const appEnabled = this.checkedApps.indexOf(app.appId) === -1 ? 'true' : 'false' // false if checked, true otherwise (saving "dont show again" so it's reserved)
				saveConfigParams.appConfigs[`introjs-dontShowAgain-${app.appId}`] = appEnabled

				// taking care of asides :)
				this.appsList.forEach((asideApp) => {
					if (!asideApp.appId.includes(app.appId)) return
					if (!asideApp.appId.includes('aside')) return // checking it's an aside of the current app
					saveConfigParams.appConfigs[`introjs-dontShowAgain-${asideApp.appId}`] = appEnabled // syncing with the current app's settings
				})
			})

			try {
				const res = await axios.put(this.saveConfigsUrl, saveConfigParams)
				showSuccess(res.data.ocs.data.message)
			} catch (err) {
				showError(err.response.data.error_message)
			}
		},

		/**
		 * Handle re-enable every app button. Simulates everything is checked and calls onSave.
		 */
		onEnableAll() {
			this.appsList.forEach((app) => {
				if (!(this.checkedApps.includes(app.appId))) this.checkedApps.push(app.appId)
			})
			this.onSave()
		},

		/**
		 * Handle disable every apps button. Simulates nothing is checked and calls onSave.
		 */
		onDisableAll() {
			this.checkedApps = []
			this.onSave()
		},

		/**
		 * Handles clicking of a link. Calls the OnSave method for that link, before redirecting
		 *
		 * @param {string} link the name of the app to redirect to
		 */
		async onLinkClick(link) {
			const saveConfigParams = { appConfigs: {} }
			saveConfigParams.appConfigs[`introjs-dontShowAgain-${link}`] = 'false'
			await axios.put(this.saveConfigsUrl, saveConfigParams)
			const redirectUrl = link === 'user' ? `/settings/${link}` : `/apps/${link}`
			window.location.href = generateUrl(redirectUrl)
		},

		/**
		 * Returns true if the app is enabled for the currrent user (or if the app is the user/admin settings section)
		 *
		 * @param {object} app the app to check
		 * @return {boolean} true if the app checks the conditions, false otherwise
		 */
		appIsInstalled(app) {
			return (this.installedApps.includes(app.appId) || app.appId === 'user' || app.appId === 'admin')
		},
	},
}
</script>

<style>
div.save-buttons-wrapper {
	display: flex;
	gap: 1rem;
	padding: 1rem 0;
	flex-wrap: wrap;
}

div.check-apps {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 0.5rem;
}

.link-apps-wrapper {
	display: flex;
	align-items: center;
	visibility: hidden;
	opacity: 0;
	transition: opacity 200ms;
}

div.check-apps:hover>.link-apps-wrapper {
	visibility: visible;
	opacity: 1;
	transition: opacity 200ms;
}

.link-apps {
	text-align: center;
}

</style>
