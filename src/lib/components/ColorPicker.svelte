<script lang="ts">
	export let value: string = '#000000';
	export let label: string = 'Color';
	export let required: boolean = false;

	// Validate hex color format
	$: isValidHex = !value || /^#[0-9A-Fa-f]{6}$/.test(value);

	// Ensure value always starts with # for color input
	$: displayValue = value && !value.startsWith('#') ? `#${value}` : value || '#000000';

	function handleTextInput(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.value;
	}

	function handleColorInput(e: Event) {
		const input = e.target as HTMLInputElement;
		value = input.value;
	}
</script>

<div class="space-y-2">
	<label class="block text-sm font-medium text-gray-700">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>

	<div class="flex gap-2 items-start">
		<!-- Text input for hex code -->
		<div class="flex-1">
			<input
				type="text"
				{value}
				on:input={handleTextInput}
				placeholder="#FF5733"
				maxlength="7"
				class="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
				class:border-red-500={!isValidHex && value}
				class:border-gray-300={isValidHex || !value}
			/>
		</div>

		<!-- Native color picker -->
		<input
			type="color"
			value={displayValue}
			on:input={handleColorInput}
			class="w-12 h-10 border border-gray-300 rounded cursor-pointer"
			title="Pick a color"
		/>

		<!-- Preview swatch -->
		<div
			class="w-12 h-10 border border-gray-300 rounded flex items-center justify-center"
			style="background-color: {isValidHex ? value : '#ffffff'}"
			title={isValidHex ? value : 'Invalid color'}
		>
			{#if !isValidHex && value}
				<span class="text-xs text-red-500">✗</span>
			{/if}
		</div>
	</div>

	<!-- Error message -->
	{#if !isValidHex && value}
		<p class="text-xs text-red-500">
			Invalid hex format. Use format: #RRGGBB (e.g., #FF5733)
		</p>
	{/if}

	<!-- Helper text -->
	{#if isValidHex || !value}
		<p class="text-xs text-gray-500">Enter hex color code or use the color picker</p>
	{/if}
</div>
