export class ScribeTool {
    constructor() {
        this.scribes = new Map(); // In-memory storage for scribe documents
    }

    getDeclaration() {
        return {
            name: 'generateScribeNotes',
            description: 'Generates medical scribe notes/documents based on patient data.',
            parameters: {
                type: 'object',
                properties: {
                    patientData: {
                        type: 'object',
                        description: 'The patient data including demographics, symptoms, and medical history.'
                    }
                },
                required: ['patientData']
            }
        };
    }

    async editScribe(scribeId, newInfo) {
        if (!this.scribes.has(scribeId)) {
            throw new ApplicationError(
                `Scribe document with ID ${scribeId} not found.`,
                ErrorCodes.NOT_FOUND
            );
        }

        const scribe = this.scribes.get(scribeId);
        scribe.notes += `\n\nUpdated Information:\n${newInfo}`;
        this.scribes.set(scribeId, scribe);

        return scribe.notes;
    }
}
