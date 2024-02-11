import { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export async function voteOnPoll(app: FastifyInstance) {
    app.post('/polls/:pollId/votes', async (request, reply) => {
        const voteOnPollBody = z.object({
            pollOptionId: z.string().uuid()
        })

        const voteOnPollParams = z.object({
            pollId: z.string().uuid()
        })
    
        const { pollOptionId } = voteOnPollBody.parse(request.body)
        const { pollId } = voteOnPollParams.parse(request.params)

        let { sessionId } = request.cookies

        if(sessionId) {
            const userPreviusVoteOnPoll = await prisma.vote.findUnique({
                where: {
                    sessionId_pollId: {
                        sessionId,
                        pollId,
                    }
                }
            })

            if (userPreviusVoteOnPoll && userPreviusVoteOnPoll.pollOptionId !== pollOptionId){
                await prisma.vote.delete({
                    where: {
                        id: userPreviusVoteOnPoll.id
                    }
                })
            }else if(userPreviusVoteOnPoll){
                return reply.status(400).send({ message: 'You already voted on this poll' })
            }
        }

        if(!sessionId){
            sessionId = randomUUID()

            reply.setCookie('sessionId', sessionId, {
                path: '/',
                maxAge: 60 * 60 * 24 * 30, // 30 days
                signed: true,
                httpOnly: true
            })
        }

        await prisma.vote.create({
            data: {
                sessionId,
                pollId,
                pollOptionId
            }
        })

        return reply.status(201).send()
    })
}