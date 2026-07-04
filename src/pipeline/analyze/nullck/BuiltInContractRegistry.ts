import * as fs from 'fs';
import * as path from 'path';
// Import YOUR existing interface from wherever it is defined
import { Contract } from '@specs-feup/coral/symbol/Nullability';
import { fileURLToPath } from 'url';
export class BuiltInContractRegistry {
    private static instance: BuiltInContractRegistry | null = null;
    private contractsMap = new Map<string, Contract[]>();

    private constructor() {
        this.loadContracts();
    }

    public static getInstance(): BuiltInContractRegistry {
        if (!BuiltInContractRegistry.instance) {
            BuiltInContractRegistry.instance = new BuiltInContractRegistry();
        }
        return BuiltInContractRegistry.instance;
    }

    private loadContracts(): void {
        try {

            const __filename = fileURLToPath(import.meta.url);
            const __dirname = path.dirname(__filename);
            const jsonPath = path.join(__dirname, 'libc_contracts.json');
     
            if (fs.existsSync(jsonPath)) {
          
                const rawData = fs.readFileSync(jsonPath, 'utf-8');
                const parsed = JSON.parse(rawData);
                
                for (const [funcName, rules] of Object.entries(parsed)) {
                    // Cast the parsed JSON array to your Contract interface
                    const contracts = rules as Contract[];

                    // OPTIMIZATION: Compile regexes immediately on load!
                    for (const contract of contracts) {
                        if (contract.isRegex && contract.target) {
                            contract.compiledRegex = new RegExp(contract.target);
                        }
                    }

                    this.contractsMap.set(funcName, contracts);
                }
            }
        } catch (error) {
            console.error("Failed to load standard library nullability contracts:", error);
        }
    }

    public hasContract(functionName: string): boolean {
        return this.contractsMap.has(functionName);
    }

    public getContracts(functionName: string): Contract[] {
        return this.contractsMap.get(functionName) || [];
    }
}