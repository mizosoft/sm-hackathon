/** Low-level AI gateway contract. */

export interface AIGatewayRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGatewayResponse {
  text: string;
}

export interface AIGateway {
  complete(request: AIGatewayRequest): Promise<AIGatewayResponse>;
}
