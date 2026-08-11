import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { getTags, createTag, updateTag, deleteTag } from "../api/tags.api";
import type { CreateTagDto, UpdateTagDto } from "../types/tags.types";
import { useT } from "@/shared/hooks/useIdioma";
import { mensajeDeError } from "@/shared/lib/errorApi";

export const TAGS_KEY = ["tags"] as const;

export function useTags() {
    return useQuery({ queryKey: TAGS_KEY, queryFn: getTags });
}

export function useCreateTag() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (dto: CreateTagDto) => createTag(dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success(t("etiquetas.creada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useUpdateTag() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateTagDto }) => updateTag(id, dto),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success(t("etiquetas.actualizada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}

export function useDeleteTag() {
    const qc = useQueryClient();
    const { t, idioma } = useT();
    return useMutation({
        mutationFn: (id: string) => deleteTag(id),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: TAGS_KEY });
            toast.success(t("etiquetas.eliminada"));
        },
        onError: (error) => toast.error(mensajeDeError(idioma, error)),
    });
}
