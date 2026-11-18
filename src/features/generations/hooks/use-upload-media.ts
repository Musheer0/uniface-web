import React from 'react'
import { useFileStore } from './use-file'
import { useTRPC } from '@/trpc/client';
import { useMutation } from '@tanstack/react-query';

const useUploadMedia = () => {
  const trpc = useTRPC()
  return useMutation(trpc.media.uploadMedia.mutationOptions())

}

export default useUploadMedia