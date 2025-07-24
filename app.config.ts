export default defineAppConfig({
	ui: {
		colors: {
			// primary: 'bg-primary',
			// secondary: 'bg-secondary',
			// info: 'bg-info',
			// success: 'bg-custom', bunlar gerekli değil
		},
		button: {
			//component özelinde ayarlanacak css ayarlamaları
			slots: {
				//bu ayarlara erişmemizi sağlar
				base: "font-bold ", //örneğin font-weight arttırma
			},
		},
	},
});
