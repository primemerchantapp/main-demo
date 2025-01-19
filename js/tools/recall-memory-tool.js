import { TextEmbeddingModel } from '@google-cloud/vertexai';
import { calculateCosineSimilarity } from '../utils/math-utils.js';

export class RecallMemoryTool {
    constructor() {
        this.memory = [];
        this.embeddingModel = new TextEmbeddingModel();
    }

    getDeclaration() {
        return {
            name: 'recallMemory',
            description: 'Stores and retrieves information using embeddings for long-term memory.',
            parameters: {
                type: 'object',
                properties: {
                    action: {
                        type: 'string',
                        enum: ['store', 'retrieve'],
                        description: 'The action to perform: "store" to save information, "retrieve" to recall information.'
                    },
                    data: {
                        type: 'string',
                        description: 'The text data to store or the query to retrieve relevant information.'
                    }
                },
                required: ['action', 'data']
            }
        };
    }

    async generateEmbedding(text) {
        const embedding = await this.embeddingModel.getEmbedding(text);
        return embedding;
    }

    async storeMemory(data) {
        const embedding = await this.generateEmbedding(data);
        this.memory.push({ data, embedding });
        Logger.info('Information stored in memory.');
    }

    async retrieveMemory(query) {
        const queryEmbedding = await this.generateEmbedding(query);
        const similarities = this.memory.map(memory => ({
            data: memory.data,
            similarity: calculateCosineSimilarity(queryEmbedding, memory.embedding)
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const mostRelevant = similarities[0];

        if (mostRelevant && mostRelevant.similarity > 0.7) {
            return mostRelevant.data;
        } else {
            return 'No relevant information found in memory.';
        }
    }

    async execute(args) {
        const { action, data } = args;

        if (action === 'store') {
            await this.storeMemory(data);
            return 'Information stored successfully.';
        } else if (action === 'retrieve') {
            const result = await this.retrieveMemory(data);
            return result;
        } else {
            throw new ApplicationError(
                `Invalid action: ${action}`,
                ErrorCodes.INVALID_PARAMETER
            );
        }
    }
}
