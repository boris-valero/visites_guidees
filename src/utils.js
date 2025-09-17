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

import axios from '@nextcloud/axios'
import { generateUrl, linkTo } from '@nextcloud/router'
import { getLanguage } from '@nextcloud/l10n'

import { APPLICATION_ID, INTROS_PATH, STRUCTURE_PATH } from './main.js'

/**
 * Retrieves the intro for the current user language. Falls back to english if the current language doesn't have an intro defined.
 *
 * @return {Promise<object>} The intros object containing intros for the current language.
 */
export async function getCurrentLanguageIntro() {
	// get the available languages (intros written in these languages)
	const langRes = await axios.get(generateUrl(`/apps/${APPLICATION_ID}/lang`))
	const introLanguages = langRes.data.ocs.data.languages

	let currentUserLanguage = getLanguage()

	if (!introLanguages.includes(currentUserLanguage)) currentUserLanguage = 'en' // if the current language has no intro, fallback to english

	// get the current intro depending on language
	const introRes = await axios.get(linkTo(APPLICATION_ID, INTROS_PATH.concat(currentUserLanguage, '.json')))
	return introRes.data
}

/**
 * Retrieves the intros structure from the backend
 *
 * @return {Promise} A promise that resolves with the intros structure.
 */
export async function getIntrosStructure() {
	const structRes = await axios.get(linkTo(APPLICATION_ID, STRUCTURE_PATH))
	return structRes.data
}

/**
 * Merges intros and structure objects by updating the steps of intros with the corresponding steps from structure
 *
 * @param {object} intros - The intros object. This object will be updated
 * @param {object} structure - The structure object
 * @param root0
 * @param root0.appVersion
 * @param root0.serverVersion
 */
export function mergeIntrosAndStructure(intros, structure, { appVersion, serverVersion }) {
	Object.keys(structure).forEach((appId) => {
		if (!(appId in intros)) throw new Error("Structure and content files don't match.")
		if (intros[appId].steps.length !== structure[appId].steps.length) throw new Error("Structure and content files don't match.")

		for (const [stepIndex, step] of intros[appId].steps.entries()) {
			let activeStep = structure[appId].steps[stepIndex]
			if (activeStep.specialForVersions) {
				activeStep = activeStep.specialForVersions.find(stepForVersion => isStepValidForVersions(stepForVersion, serverVersion, appVersion)) ?? activeStep
			}

			for (const [key, value] of Object.entries(activeStep)) {
				step[key] = value
			}
		}
	})
}

/**
 * @param {object} stepForVersion the step
 * @param {string} serverVersion the server version
 * @param {string} appVersion the app version
 */
function isStepValidForVersions(stepForVersion, serverVersion, appVersion) {
	return (stepForVersion.type === 'server' && stepForVersion.versions.includes(serverVersion.toString())) || (stepForVersion.type === 'app' && stepForVersion.versions.includes(appVersion.toString()))
}
