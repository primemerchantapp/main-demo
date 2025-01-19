import { RecallMemoryTool } from './recall-memory-tool.js';
import { ScribeTool } from './scribe-tool.js';
import { EmailTool } from './email-tool.js';

export class ConversationManagerTool {
    constructor() {
        this.recallMemoryTool = new RecallMemoryTool();
        this.scribeTool = new ScribeTool();
        this.emailTool = new EmailTool();
    }

    getDeclaration() {
        return {
            name: 'manageConversation',
            description: 'Manages the sequence of saving a conversation, recalling memory, editing an old scribe, and sending it via email.',
            parameters: {
                type: 'object',
                properties: {
                    conversation: {
                        type: 'string',
                        description: 'The conversation to save.'
                    },
                    query: {
                        type: 'string',
                        description: 'The query to retrieve relevant information from memory.'
                    },
                    scribeId: {
                        type: 'string',
                        description: 'The ID of the scribe document to edit.'
                    },
                    emailRecipient: {
                        type: 'string',
                        description: 'The email address of the recipient.'
                    }
                },
                required: ['conversation', 'query', 'scribeId', 'emailRecipient']
            }
        };
    }

    async execute(args) {
        const { conversation, query, scribeId, emailRecipient } = args;

        // Step 1: Save the conversation to memory
        await this.recallMemoryTool.storeMemory(conversation);
        Logger.info('Conversation saved to memory.');

        // Step 2: Recall relevant information from memory
        const relevantInfo = await this.recallMemoryTool.retrieveMemory(query);
        Logger.info('Relevant information retrieved from memory.');

        // Step 3: Edit the old scribe document
        const updatedScribe = await this.scribeTool.editScribe(scribeId, relevantInfo);
        Logger.info('Scribe document updated.');

        // Step 4: Send the updated scribe document via email
        const emailResponse = await this.emailTool.sendEmail({
            to: emailRecipient,
            subject: 'Updated Scribe Document',
            body: updatedScribe
        });
        Logger.info('Email sent successfully.');

        return 'Sequence completed successfully.';
    }
}
