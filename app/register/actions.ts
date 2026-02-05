'use server';

import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function registerUser(formData: {
  email: string;
  password: string;
  name: string;
}) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: formData.email },
    });

    if (existingUser) {
      return { error: 'El correo electrónico ya está registrado' };
    }

    // Hash password
    const hashedPassword = await hash(formData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: formData.email,
        password: hashedPassword,
        name: formData.name,
      },
    });

    return { success: true, userId: user.id };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Error al crear la cuenta. Por favor, intente de nuevo.' };
  }
}
