import Vue from 'vue'
import AdminSettings from './components/AdminSettings.vue'
Vue.mixin({ methods: { t, n } })

const VueSettings = Vue.extend(AdminSettings)
new VueSettings().$mount('#introjs_settings')
