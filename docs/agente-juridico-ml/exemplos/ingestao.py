"""
Exemplo de Ingestão de Legislação

Este script demonstra como ingerir documentos de legislação no sistema.
"""

import sys
sys.path.append('..')

from agente import AgenteJuridico


def main():
    print("=" * 60)
    print("AGENTE JURÍDICO LICITAGYM - EXEMPLO DE INGESTÃO")
    print("=" * 60)
    
    # Inicializar agente
    print("\n[1/2] Inicializando agente...")
    agente = AgenteJuridico()
    
    # Lista de URLs de legislação importante
    urls_legislacao = [
        {
            'url': 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm',
            'descricao': 'Lei 14.133/2021 - Nova Lei de Licitações'
        },
        {
            'url': 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2017/decreto/D9507.htm',
            'descricao': 'Decreto 9.507/2018 - Pregão Eletrônico'
        },
        {
            'url': 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/decreto/d10828.htm',
            'descricao': 'Decreto 10.828/2021 - Regulamentação Lei 14.133'
        }
    ]
    
    print("\n[2/2] Legislação disponível para ingestão:")
    for i, item in enumerate(urls_legislacao, 1):
        print(f"   {i}. {item['descricao']}")
    
    print("\n" + "=" * 60)
    print("MENU DE INGESTÃO")
    print("=" * 60)
    print("\nOpções:")
    print("  1-3: Ingerir legislação correspondente")
    print("  4: Ingerir arquivo local")
    print("  5: Listar legislação já ingerida")
    print("  0: Sair")
    
    while True:
        try:
            opcao = input("\n📥 Escolha uma opção: ").strip()
            
            if opcao == '0':
                print("\nEncerrando...")
                break
            
            elif opcao in ['1', '2', '3']:
                idx = int(opcao) - 1
                item = urls_legislacao[idx]
                
                print(f"\n⏳ Ingerindo: {item['descricao']}")
                print(f"   URL: {item['url']}")
                
                resultado = agente.ingerir_documento(item['url'])
                
                if resultado and resultado.get('sucesso'):
                    print(f"\n✅ Sucesso!")
                    print(f"   ID: {resultado['id']}")
                    print(f"   Título: {resultado['titulo']}")
                    print(f"   Tipo: {resultado['tipo']}")
                    print(f"   Data: {resultado['data_publicacao']}")
                else:
                    print(f"\n❌ Falha na ingestão")
                    print(f"   Resultado: {resultado}")
            
            elif opcao == '4':
                caminho = input("\n📁 Digite o caminho do arquivo: ").strip()
                
                if not caminho:
                    print("   Caminho vazio!")
                    continue
                
                print(f"\n⏳ Ingerindo arquivo: {caminho}")
                
                resultado = agente.ingerir_documento(caminho)
                
                if resultado and resultado.get('sucesso'):
                    print(f"\n✅ Sucesso!")
                    print(f"   ID: {resultado['id']}")
                    print(f"   Título: {resultado['titulo']}")
                else:
                    print(f"\n❌ Falha na ingestão")
            
            elif opcao == '5':
                print("\n⏳ Listando legislação ingerida...")
                
                legislacao = agente.listar_legislacao(limite=20)
                
                if legislacao:
                    print(f"\n📚 Legislação encontrada ({len(legislacao)} documentos):")
                    for doc in legislacao:
                        print(f"   • {doc['titulo']} ({doc['tipo']})")
                        print(f"     Órgão: {doc.get('orgao_emissor', 'N/A')}")
                        print(f"     Esfera: {doc.get('esfera', 'N/A')}")
                else:
                    print("\n   Nenhuma legislação encontrada.")
            
            else:
                print("   Opção inválida! Tente novamente.")
        
        except KeyboardInterrupt:
            print("\n\nOperação interrompida pelo usuário.")
            break
        except Exception as e:
            print(f"\n❌ Erro: {e}")
            print("   Verifique a conexão ou configuração.\n")


if __name__ == "__main__":
    main()
