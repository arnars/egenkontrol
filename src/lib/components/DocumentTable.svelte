<script lang="ts">
	let { columns, rows }: { columns: string[]; rows: string[][] } = $props();
</script>

<div class="my-1 overflow-x-auto border-y border-line">
	<table
		class="w-full min-w-[900px] table-fixed border-collapse text-left font-sans text-sm leading-relaxed"
	>
		<thead>
			<tr class="border-b border-ink">
				{#each columns as column}
					<th
						class="px-3 py-3 align-bottom font-mono text-[10px] tracking-wider text-muted uppercase first:pl-0 last:pr-0"
					>
						{column}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row}
				<tr class="border-b border-line last:border-0">
					{#each row as cell, index}
						<td class="px-3 py-4 align-top first:pl-0 last:pr-0" class:font-medium={index === 0}
							>{cell}</td
						>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
