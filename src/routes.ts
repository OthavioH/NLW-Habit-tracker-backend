import { FastifyInstance } from "fastify";
import { prisma } from "./lib/prisma";
import { z } from "zod";
import dayjs from "dayjs";

export async function appRoutes(app: FastifyInstance) {
  app.get("/", async (req, res) => {
    const users = await prisma.user.findMany();
    return res.send({ users, prismaURL: process.env.DATABASE_URL });
  });

  app.post("/users", async (request, res) => {
    const createUserBody = z.object({
      name: z.string(),
      email: z.string().email(),
      given_name: z.string(),
      locale: z.string(),
      picture: z.string(),
      verified_email: z.boolean(),
    });

    const { name, email, given_name, locale, picture, verified_email } =
      createUserBody.parse(request.body);

    let user;

    user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          given_name,
          locale,
          picture,
          verified_email,
        },
      });
    }

    return res.status(201).type("application/json").send(user);
  });

  app.post("/habits", async (request) => {
    const createHabityBody = z.object({
      title: z.string(),
      weekDays: z.array(z.number().min(0).max(6)),
      user_id: z.string().uuid(),
    });

    const { title, weekDays, user_id } = createHabityBody.parse(request.body);

    const today = dayjs().startOf("day").toDate();

    await prisma.habit.create({
      data: {
        title,
        created_at: today,
        user_id,
        weekDays: {
          create: weekDays.map((weekDay) => {
            return {
              week_day: weekDay,
            };
          }),
        },
      },
    });
  });

  app.get("/:user_id/day", async (request) => {
    const getDayQueryParams = z.object({
      date: z.coerce.date(),
    });

    const userIdParams = z.object({
      user_id: z.string().uuid(),
    });

    const { date } = getDayQueryParams.parse(request.query);
    const { user_id } = userIdParams.parse(request.params);

    // todos os hábitos possíveis do dia
    // hábitos que já foram marcados

    const parsedDate = dayjs(date).startOf("day");
    const weekDay = dayjs(parsedDate).get("day");

    const possibleHabits = await prisma.habit.findMany({
      where: {
        user_id,
        created_at: {
          lte: date,
        },
        weekDays: {
          some: {
            week_day: weekDay,
          },
        },
      },
    });

    const day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: parsedDate.toDate(),
          user_id,
        },
      },
      include: {
        dayHabits: true,
      },
    });

    const completedHabits =
      day?.dayHabits.map((dayHabit) => {
        return dayHabit.habit_id;
      }) ?? [];

    return {
      possibleHabits,
      completedHabits,
    };
  });

  app.patch("/:user_id/habits/:id/toggle", async (request) => {
    const toggleHabitParams = z.object({
      id: z.string().uuid(),
      user_id: z.string().uuid(),
    });

    const { id, user_id } = toggleHabitParams.parse(request.params);

    const today = dayjs().startOf("day").toDate();

    let day = await prisma.day.findUnique({
      where: {
        date_user_id: {
          date: today,
          user_id: user_id,
        },
      },
    });

    if (!day) {
      day = await prisma.day.create({
        data: {
          date: today,
          user_id,
        },
      });
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id_user_id: {
          day_id: day.id,
          habit_id: id,
          user_id,
        },
      },
    });

    if (dayHabit) {
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        },
      });
    } else {
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
          user_id,
        },
      });
    }
  });

  app.get("/:user_id/summary", async (request) => {
    // [ { date: 17/01, amount: 5, completed: 1 }, {}, {}]
    const getSummaryParams = z.object({
      user_id: z.string().uuid(),
    });

    const { user_id: userId } = getSummaryParams.parse(request.params);

    const summary = await prisma.$queryRaw`
            SELECT 
                D.id, 
                D.date,
                (
                    SELECT 
                        cast(COUNT(*) as float) 
                    FROM day_habits DH
                    WHERE DH.day_id = D.id AND DH.user_id = ${userId}
                ) as completed,
                (
                    SELECT
                        cast(COUNT(*) as float)
                    FROM habit_week_days HWD
                    JOIN habits H
                        ON H.id = HWD.habit_id
                    WHERE
                        HWD.week_day = EXTRACT(DOW FROM D.date) + 1
                        AND H.created_at <= D.date
                ) as amount
            FROM days D WHERE D.user_id = ${userId}
        `;
    return summary;
  });
}
