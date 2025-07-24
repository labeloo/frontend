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
			// Color-specific styling for buttons
			color: {
				primary: {
					solid: 'text-white bg-primary hover:bg-primary/90 disabled:bg-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
					outline: 'text-primary bg-transparent border border-primary hover:bg-primary hover:text-white disabled:bg-transparent disabled:text-primary/50 disabled:border-primary/50',
					soft: 'text-primary bg-primary/10 hover:bg-primary/20 disabled:bg-primary/5 disabled:text-primary/50',
					ghost: 'text-primary hover:bg-primary/10 disabled:bg-transparent disabled:text-primary/50',
					link: 'text-primary hover:text-primary/80 disabled:text-primary/50'
				}
			}
		},
	},
});
