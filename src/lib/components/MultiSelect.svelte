<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Props
	export let options: Array<{ id: string; name: string; hex_code?: string; description?: string }> = [];
	export let selectedValues: string[] = [];
	export let placeholder: string = 'Select options...';
	export let label: string = '';
	export let required: boolean = false;
	export let disabled: boolean = false;
	export let showColorDots: boolean = false; // For color options with hex codes

	const dispatch = createEventDispatcher<{ change: string[] }>();

	// Toggle selection
	function toggleOption(optionName: string) {
		if (disabled) return;

		if (selectedValues.includes(optionName)) {
			selectedValues = selectedValues.filter(v => v !== optionName);
		} else {
			selectedValues = [...selectedValues, optionName];
		}

		dispatch('change', selectedValues);
	}

	// Remove a selected value (from chips)
	function removeValue(value: string) {
		if (disabled) return;
		selectedValues = selectedValues.filter(v => v !== value);
		dispatch('change', selectedValues);
	}

	// Get option by name
	function getOptionByName(name: string) {
		return options.find(opt => opt.name === name);
	}

	let dropdownOpen = false;
	let dropdownEl: HTMLDivElement;

	// Close dropdown when clicking outside
	function handleClickOutside(event: MouseEvent) {
		if (dropdownEl && !dropdownEl.contains(event.target as Node)) {
			dropdownOpen = false;
		}
	}

	$: {
		if (dropdownOpen) {
			document.addEventListener('click', handleClickOutside);
		} else {
			document.removeEventListener('click', handleClickOutside);
		}
	}
</script>

<div class="multi-select-container">
	{#if label}
		<label class="block text-sm font-medium text-gray-700 mb-1">
			{label}
			{#if required}
				<span class="text-red-500">*</span>
			{/if}
		</label>
	{/if}

	<div bind:this={dropdownEl} class="relative">
		<!-- Selected values (chips) + dropdown trigger -->
		<div
			class="multi-select-input"
			class:disabled
			class:open={dropdownOpen}
			on:click={() => !disabled && (dropdownOpen = !dropdownOpen)}
			role="button"
			tabindex="0"
			on:keydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					!disabled && (dropdownOpen = !dropdownOpen);
				}
			}}
		>
			{#if selectedValues.length === 0}
				<span class="placeholder">{placeholder}</span>
			{:else}
				<div class="chips-container">
					{#each selectedValues as value}
						{@const option = getOptionByName(value)}
						<div class="chip">
							{#if showColorDots && option?.hex_code}
								<span
									class="color-dot"
									style="background-color: {option.hex_code};"
								></span>
							{/if}
							<span class="chip-text">{value}</span>
							<button
								type="button"
								class="chip-remove"
								on:click|stopPropagation={() => removeValue(value)}
								disabled={disabled}
							>
								×
							</button>
						</div>
					{/each}
				</div>
			{/if}

			<svg
				class="dropdown-arrow"
				class:rotate={dropdownOpen}
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
			</svg>
		</div>

		<!-- Dropdown options -->
		{#if dropdownOpen}
			<div class="dropdown-menu">
				{#if options.length === 0}
					<div class="dropdown-item disabled">No options available</div>
				{:else}
					{#each options as option}
						{@const isSelected = selectedValues.includes(option.name)}
						<div
							class="dropdown-item"
							class:selected={isSelected}
							on:click={() => toggleOption(option.name)}
							role="option"
							aria-selected={isSelected}
						>
							<div class="checkbox-container">
								<input
									type="checkbox"
									checked={isSelected}
									readonly
									class="checkbox"
								/>
							</div>

							{#if showColorDots && option.hex_code}
								<span
									class="color-dot"
									style="background-color: {option.hex_code};"
								></span>
							{/if}

							<span class="option-label">{option.name}</span>

							{#if option.description}
								<span class="option-description">{option.description}</span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.multi-select-container {
		width: 100%;
	}

	.multi-select-input {
		position: relative;
		display: flex;
		align-items: center;
		min-height: 42px;
		padding: 6px 36px 6px 12px;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		background-color: white;
		cursor: pointer;
		transition: border-color 0.2s, box-shadow 0.2s;
	}

	.multi-select-input:hover:not(.disabled) {
		border-color: #9ca3af;
	}

	.multi-select-input.open {
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.multi-select-input.disabled {
		background-color: #f3f4f6;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.placeholder {
		color: #9ca3af;
		font-size: 14px;
	}

	.chips-container {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		flex: 1;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background-color: #eff6ff;
		border: 1px solid #bfdbfe;
		border-radius: 6px;
		font-size: 13px;
		color: #1e40af;
	}

	.chip-text {
		line-height: 1;
	}

	.chip-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		background: none;
		color: #60a5fa;
		font-size: 18px;
		font-weight: bold;
		cursor: pointer;
		padding: 0;
		line-height: 1;
		transition: color 0.2s;
	}

	.chip-remove:hover:not(:disabled) {
		color: #1e40af;
	}

	.chip-remove:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.color-dot {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1px solid rgba(0, 0, 0, 0.1);
	}

	.dropdown-arrow {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		width: 20px;
		height: 20px;
		color: #6b7280;
		transition: transform 0.2s;
		pointer-events: none;
	}

	.dropdown-arrow.rotate {
		transform: translateY(-50%) rotate(180deg);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		max-height: 240px;
		overflow-y: auto;
		background-color: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		z-index: 50;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		cursor: pointer;
		transition: background-color 0.15s;
		font-size: 14px;
	}

	.dropdown-item:hover:not(.disabled) {
		background-color: #f9fafb;
	}

	.dropdown-item.selected {
		background-color: #eff6ff;
	}

	.dropdown-item.disabled {
		color: #9ca3af;
		cursor: not-allowed;
	}

	.checkbox-container {
		display: flex;
		align-items: center;
	}

	.checkbox {
		width: 16px;
		height: 16px;
		cursor: pointer;
	}

	.option-label {
		flex: 1;
		color: #111827;
	}

	.option-description {
		font-size: 12px;
		color: #6b7280;
		margin-left: auto;
	}
</style>
