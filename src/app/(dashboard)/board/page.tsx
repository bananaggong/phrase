import { createServerSupabaseClient } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export default async function BoardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  const projects = await prisma.project.findMany({
    where: { userId: user!.id },
    include: { stepFiles: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-900">프로젝트 보드</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          새 프로젝트
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">아직 프로젝트가 없습니다.</p>
          <Link href="/projects/new" className="mt-3 inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            첫 프로젝트 만들기 →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-medium text-slate-900 text-sm leading-snug">{project.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  project.status === 'ACTIVE'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {project.status === 'ACTIVE' ? '진행중' : '초안'}
                </span>
              </div>
              {project.description && (
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{project.description}</p>
              )}
              <p className="text-xs text-slate-400">파일 {project.stepFiles.length}개</p>
              <DeleteProjectButton projectId={project.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
