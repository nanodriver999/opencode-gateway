import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChatInputError, normalizeChatRequest, splitModel, toChatCompletion } from '../build/chat-contract.js';

describe('OpenAI Chat Completions contract', () => {
  it('normalizes system and user messages', () => {
    const parsed = normalizeChatRequest({
      model: 'opencode/muse-spark-1.3-contributor-free',
      messages: [{role:'system',content:'Be brief'},{role:'user',content:'Hello'}],
    });
    assert.deepEqual(parsed, {
      model: 'opencode/muse-spark-1.3-contributor-free',
      system: 'Be brief',
      prompt: 'Hello',
    });
  });
  it('rejects unsupported parameters, images and assistant history', () => {
    const message = [{role:'user',content:'Hello'}];
    for (const body of [
      {model:'x',stream:true,messages:message},
      {model:'x',temperature:0,messages:message},
      {model:'x',messages:[{role:'assistant',content:'old'}, ...message]},
      {model:'x',messages:[{role:'user',content:[{type:'image_url',image_url:{url:'x'}}]}]},
    ]) assert.throws(() => normalizeChatRequest(body), ChatInputError);
  });
  it('uses the free provider and preserves model ID', () => {
    assert.deepEqual(splitModel('opencode/muse-spark-1.3-contributor-free','opencode'),{
      providerID:'opencode',modelID:'muse-spark-1.3-contributor-free',
    });
  });
  it('maps text parts, tokens and completion metadata', () => {
    const result = toChatCompletion('opencode/muse-spark-1.3-contributor-free',{
      info:{finish:'stop',tokens:{input:10,output:4}},
      parts:[{type:'reasoning',text:'hidden'},{type:'text',text:'Hello'}],
    },'chatcmpl-test',1000);
    assert.equal(result.choices[0].message.content,'Hello');
    assert.equal(result.usage.total_tokens,14);
    assert.equal(result.created,1000);
  });
});
