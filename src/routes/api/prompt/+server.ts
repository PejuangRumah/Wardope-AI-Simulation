// API Endpoint - Get default system prompt template
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDefaultPromptTemplate } from '$lib/services/outfit-generator';

export const GET: RequestHandler = async () => {
	try {
		const template = getDefaultPromptTemplate();

		return json({
			template,
			variables: [
				{
					name: '{{occasion}}',
					description: 'The selected occasion (e.g., casual, formal, party)',
					required: true,
					occurrences: 2
				},
				{
					name: '{{note}}',
					description: 'User\'s additional preference notes',
					required: false,
					occurrences: 1
				}
			],
			instructions:
				'Template variables ({{variable}}) will be automatically replaced with actual values. Do not remove them unless you know what you are doing.'
		});
	} catch (error) {
		console.error('Error fetching prompt template:', error);

		return json(
			{
				error: 'Failed to fetch prompt template',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
