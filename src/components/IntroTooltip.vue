<template>
	<div id="intro-vue">
		<template v-if="loading">
			<NcLoadingIcon />
		</template>
		<template v-else>
			<img v-if="properties.img" :src="properties.img" alt="">
			<div v-for="(para, index) in properties.paragraphs" :key="index">
				<p v-html="para" /> <!-- eslint-disable-line vue/no-v-html -->
			</div>
			<template v-if="properties.choices">
				<div class="links-wrapper">
					<div v-for="(choice, index) in properties.choices" :key="index">
						<NcButton :type="choice.success ? 'success' : 'error'" @click="onChoiceClick(choice)">
							{{ choice.label.charAt(0).toUpperCase() + choice.label.slice(1) }}
						</NcButton>
					</div>
				</div>
			</template>
			<template v-if="properties.links">
				<div class="links-wrapper">
					<div v-for="(link, index) in computedLinks" :key="index">
						<NcButton type="primary" @click="onLinkClick(link.linkId)">
							{{ link.linkName.charAt(0).toUpperCase() + link.linkName.slice(1) }}
						</NcButton>
					</div>
				</div>
			</template>
			<template v-if="properties.button">
				<div class="button-wrapper">
					<NcCheckboxRadioSwitch id="intro-keep"
						style="color: #999999 !important;"
						:checked.sync="playAgain"
						type="switch"
						@update:checked="onSave(properties.app.appId, !(playAgain))">
						{{ t('intros', 'Play this tutorial again next time') }}
					</NcCheckboxRadioSwitch>
				</div>
			</template>
		</template>
	</div>
</template>

<script>
import NcCheckboxRadioSwitch from '@nextcloud/vue/dist/Components/NcCheckboxRadioSwitch.js'
import NcLoadingIcon from '@nextcloud/vue/dist/Components/NcLoadingIcon.js'
import NcButton from '@nextcloud/vue/dist/Components/NcButton.js'

import { generateUrl } from '@nextcloud/router'
import axios from '@nextcloud/axios'
import { showError } from '@nextcloud/dialogs'

export default {
	name: 'IntroTooltip',

	components: {
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcButton,
	},

	data() {
		return {
			loading: true,
			properties: { paragraphs: [], img: '', button: false, app: {}, links: [], choices: [], introManager: undefined }, // properties passed by introManager.js
			playAgain: false, // associated with 'play again next time' button
			installedApps: [],
		}
	},

	computed: {
		linksUrl() {
			return this.properties.links.map((link) => generateUrl(`/apps/${link.linkId}/`))
		},

		saveConfigUrl() {
			return generateUrl('/apps/intros/saveconf')
		},

		computedLinks() {
			return this.properties.links.filter((link) => (this.installedApps.includes(link.linkId) || link.linkId === 'user' || link.linkId === 'admin'))
		},
	},

	async mounted() {
		if (this.properties.links) {
			try {
				this.installedApps = (await axios.get(generateUrl('/apps/intros/apps'))).data.ocs.data.apps
			} catch (err) {
				this.error = err
				this.loading = false
			}
		}
		if (this.properties.button) {
			await this.onSave(this.properties.app.appId, !(this.playAgain), false)
		}
		this.loading = false
	},

	methods: {
		/**
		 * Saves the config for the specified app (whether to play it again or not next time)
		 *
		 * @param {string} app - The name of the app
		 * @param {boolean} value - The value to save
		 * @param {boolean} [showMessage] - Whether an error message should be shown in case of error
		 */
		async onSave(app, value, showMessage = true) {
			const saveConfigParams = {
				key: `introjs-dontShowAgain-${app}`,
				value: value.toString(), // values are stored as strings in NC config
			}
			try {
				await axios.put(this.saveConfigUrl, saveConfigParams)
			} catch (err) {
				if (showMessage) showError(err.response.data.error_message)
			}
		},

		/**
		 * Handles clicking of a link. Calls the OnSave method for that link, before redirecting
		 *
		 * @param {string} link the name of the app
		 */
		async onLinkClick(link) {
			await this.onSave(link, false, false) // enable the intro of the app clicked
			window.location.href = generateUrl(`/apps/${link}`)
		},

		/**
		 * Handles clicking of a choice. Goes to the next step or stops the intro, accordingly.
		 *
		 * @param {object} choice the choice provided (success or error)
		 */
		onChoiceClick(choice) {
			if (choice.success) {
				this.properties.introManager.intro.nextStep()
			} else {
				this.onSave(this.properties.app.appId, true) // deactivate the intro next time
				this.properties.introManager.stopIntro()
			}
		},
	},
}
</script>

<style>
img {
	max-width: 100%;
}

div.button-wrapper {
	display: flex;
	justify-content: center;
}

div.links-wrapper {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	column-gap: 1rem;
	row-gap: 0.25rem;
	padding: 0.5rem 0;
}

div.links-upper-wrapper {
	padding: 1rem 0 0 0;
}
</style>
