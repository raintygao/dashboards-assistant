/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { schema } from '@osd/config-schema';
import {
  ILegacyScopedClusterClient,
  IOpenSearchDashboardsResponse,
  IRouter,
  ResponseError,
} from '../../../../../src/core/server';
import { LANGCHAIN_API } from '../../../common/constants/llm';
import { AgentFactory } from '../../langchain/agents/chat_conv_agent';
import { PPLTools } from '../../langchain/tools/ppl';

export function registerLangChainRoutes(router: IRouter) {
  router.post(
    {
      path: LANGCHAIN_API.PPL_GENERATOR,
      validate: {
        body: schema.object({
          index: schema.string(),
          question: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      try {
        const { index, question } = request.body;
        const observabilityClient: ILegacyScopedClusterClient =
          // @ts-ignore https://github.com/opensearch-project/OpenSearch-Dashboards/issues/4274
          context.observability_plugin.observabilityClient.asScoped(request);
        const pplTools = new PPLTools(
          context.core.opensearch.client.asCurrentUser,
          observabilityClient
        );
        const ppl = await pplTools.generatePPL(question, index);
        return response.ok({ body: ppl });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );

  router.post(
    {
      path: LANGCHAIN_API.AGENT_TEST,
      validate: {
        body: schema.object({
          question: schema.string(),
        }),
      },
    },
    async (
      context,
      request,
      response
    ): Promise<IOpenSearchDashboardsResponse<any | ResponseError>> => {
      try {
        const { question } = request.body;
        const opensearchObservabilityClient: ILegacyScopedClusterClient =
          // @ts-ignore https://github.com/opensearch-project/OpenSearch-Dashboards/issues/4274
          context.observability_plugin.observabilityClient.asScoped(request);
        const agent = new AgentFactory(
          context.core.opensearch.client,
          opensearchObservabilityClient
        );
        await agent.init();
        const agentResponse = await agent.run(question);
        return response.ok({ body: agentResponse });
      } catch (error) {
        return response.custom({
          statusCode: error.statusCode || 500,
          body: error.message,
        });
      }
    }
  );
}
